"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth-guards"
import { repuestoSchema, movimientoSchema, type RepuestoInput, type MovimientoInput } from "@/lib/validators/repuesto"
import { logHistorial } from "@/lib/historial"
import { TIPO_EVENTO } from "@/lib/constants"

type ActionResult = { ok: false; error: string } | { ok: true }

// ─── Repuestos ────────────────────────────────────────────────────────────
export async function createRepuesto(
  input: RepuestoInput,
  stockInicial: number = 0,
): Promise<ActionResult> {
  const parsed = repuestoSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const guard = await requireAdmin()
  if (!guard.ok) return { ok: false, error: guard.error }
  const { supabase, user } = guard

  // Normalizamos strings vacíos a null (categoria, codigo, ubicacion)
  const cleanCategoria = parsed.data.categoria?.trim() || null
  const cleanUbicacion = parsed.data.ubicacion?.trim() || null
  const cleanCodigoInput = parsed.data.codigo?.trim() || null

  const { data, error } = await supabase
    .from("repuestos")
    .insert({
      ...parsed.data,
      categoria: cleanCategoria,
      ubicacion: cleanUbicacion,
      codigo: cleanCodigoInput,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id, id_publico, nombre, codigo")
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message ?? "No se pudo crear el repuesto" }
  }

  // Wave 1.7 — Autogenerar código interno con el id_publico si el user lo dejó vacío
  if (!data.codigo) {
    await supabase
      .from("repuestos")
      .update({ codigo: data.id_publico })
      .eq("id", data.id)
  }

  // Wave 1.3 — Stock inicial (opcional). Genera un movimiento ENTRADA con motivo
  // explícito. NO toca caja (los movimientos de stock nunca tocan caja).
  if (stockInicial > 0) {
    const { error: movErr } = await supabase
      .from("repuestos_movimientos")
      .insert({
        repuesto_id: data.id,
        tipo: "ENTRADA",
        cantidad: stockInicial,
        motivo: "Stock inicial de carga (no afecta caja)",
        created_by: user.id,
      })
    if (movErr) {
      // El repuesto ya se creó; devolvemos error pero no revertimos
      return {
        ok: false,
        error: `Repuesto creado, pero falló el stock inicial: ${movErr.message}`,
      }
    }
    await logHistorial(supabase, {
      tipo: TIPO_EVENTO.STOCK_MOVIMIENTO,
      descripcion: `Stock inicial de ${data.id_publico}: ${stockInicial} unidad(es). No afecta caja.`,
      entidadTipo: "repuesto",
      entidadId: data.id_publico,
      payload: { tipo: "ENTRADA", cantidad: stockInicial, motivo: "Stock inicial de carga" },
      userId: user.id,
    })
  }

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.NOTA,
    descripcion: `Nuevo repuesto ${data.id_publico} · ${data.nombre}`,
    entidadTipo: "repuesto",
    entidadId: data.id_publico,
    userId: user.id,
  })

  revalidatePath("/stock")
  redirect(`/stock/${data.id}`)
}

export async function updateRepuesto(id: string, input: RepuestoInput): Promise<ActionResult> {
  const parsed = repuestoSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const guard = await requireAdmin()
  if (!guard.ok) return { ok: false, error: guard.error }
  const { supabase, user } = guard

  // Normalizamos strings vacíos a null para no ensuciar los SELECT DISTINCT
  // que alimentan el ComboBox de categorías/ubicaciones.
  const cleanData = {
    ...parsed.data,
    categoria: parsed.data.categoria?.trim() || null,
    ubicacion: parsed.data.ubicacion?.trim() || null,
    codigo: parsed.data.codigo?.trim() || null,
    updated_by: user.id,
  }

  const { data, error } = await supabase
    .from("repuestos")
    .update(cleanData)
    .eq("id", id)
    .select("id_publico")
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message ?? "No se pudo actualizar" }
  }

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.NOTA,
    descripcion: `Repuesto ${data.id_publico} editado`,
    entidadTipo: "repuesto",
    entidadId: data.id_publico,
    userId: user.id,
  })

  revalidatePath("/stock")
  revalidatePath(`/stock/${id}`)
  return { ok: true }
}

export async function toggleRepuestoActivo(id: string): Promise<ActionResult> {
  const guard = await requireAdmin()
  if (!guard.ok) return { ok: false, error: guard.error }
  const { supabase, user } = guard

  const { data: current, error: readErr } = await supabase
    .from("repuestos")
    .select("activo, id_publico")
    .eq("id", id)
    .single()
  if (readErr || !current) return { ok: false, error: "Repuesto no encontrado" }

  const nuevoActivo = !current.activo

  const { error } = await supabase
    .from("repuestos")
    .update({ activo: nuevoActivo, updated_by: user.id })
    .eq("id", id)
  if (error) return { ok: false, error: error.message }

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.NOTA,
    descripcion: `Repuesto ${current.id_publico} ${nuevoActivo ? "reactivado" : "desactivado"}`,
    entidadTipo: "repuesto",
    entidadId: current.id_publico,
    userId: user.id,
  })

  revalidatePath("/stock")
  revalidatePath(`/stock/${id}`)
  return { ok: true }
}

// ─── Movimientos de stock ─────────────────────────────────────────────────
export async function registrarMovimiento(input: MovimientoInput): Promise<ActionResult> {
  const parsed = movimientoSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const guard = await requireAdmin()
  if (!guard.ok) return { ok: false, error: guard.error }
  const { supabase, user } = guard

  // El trigger aplicar_movimiento_stock() en SQL hace toda la logica
  // (calcular stock_anterior/nuevo, actualizar repuestos.stock_actual, validar
  // que no quede negativo). Aca solo insertamos el evento.
  const { error } = await supabase.from("repuestos_movimientos").insert({
    repuesto_id: parsed.data.repuesto_id,
    tipo:        parsed.data.tipo,
    cantidad:    parsed.data.cantidad,
    motivo:      parsed.data.motivo ?? null,
    created_by:  user.id,
  })

  if (error) {
    // El trigger puede lanzar excepcion (stock negativo, repuesto inactivo)
    return { ok: false, error: error.message }
  }

  // Traigo el id_publico solo para el log de historial
  const { data: rep } = await supabase
    .from("repuestos")
    .select("id_publico")
    .eq("id", parsed.data.repuesto_id)
    .single()

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.STOCK_MOVIMIENTO,
    descripcion: `${parsed.data.tipo} · ${parsed.data.cantidad} unidad(es) de ${rep?.id_publico ?? "repuesto"}`,
    entidadTipo: "repuesto",
    entidadId: rep?.id_publico ?? parsed.data.repuesto_id,
    payload: {
      tipo: parsed.data.tipo,
      cantidad: parsed.data.cantidad,
      motivo: parsed.data.motivo ?? null,
    },
    userId: user.id,
  })

  revalidatePath("/stock")
  revalidatePath(`/stock/${parsed.data.repuesto_id}`)
  return { ok: true }
}
