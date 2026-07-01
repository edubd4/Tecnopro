"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth-guards"
import { repuestoSchema, movimientoSchema, type RepuestoInput, type MovimientoInput } from "@/lib/validators/repuesto"
import { logHistorial } from "@/lib/historial"
import { TIPO_EVENTO } from "@/lib/constants"

type ActionResult = { ok: false; error: string } | { ok: true }

// ─── Repuestos ────────────────────────────────────────────────────────────
export async function createRepuesto(input: RepuestoInput): Promise<ActionResult> {
  const parsed = repuestoSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const guard = await requireAdmin()
  if (guard.error) return { ok: false, error: guard.error }
  const { supabase, user } = guard

  const { data, error } = await supabase
    .from("repuestos")
    .insert({
      ...parsed.data,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id, id_publico, nombre")
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message ?? "No se pudo crear el repuesto" }
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
  if (guard.error) return { ok: false, error: guard.error }
  const { supabase, user } = guard

  const { data, error } = await supabase
    .from("repuestos")
    .update({ ...parsed.data, updated_by: user.id })
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
  if (guard.error) return { ok: false, error: guard.error }
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
  if (guard.error) return { ok: false, error: guard.error }
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
