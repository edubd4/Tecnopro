"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import {
  movimientoCreateSchema,
  cobrarOrdenSchema,
  type MovimientoCreateInput,
  type CobrarOrdenInput,
} from "@/lib/validators/caja"
import { logHistorial } from "@/lib/historial"
import { TIPO_EVENTO } from "@/lib/constants"

type ActionResult<T = void> = { ok: false; error: string } | { ok: true; data?: T }

async function requireAdmin() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "No autenticado" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, activo")
    .eq("id", user.id)
    .single()
  if (!profile?.activo) return { ok: false as const, error: "Usuario inactivo" }
  if (profile.rol !== "admin") {
    return { ok: false as const, error: "Solo administradores pueden operar la caja" }
  }

  return { ok: true as const, supabase, user }
}

// ─── Crear movimiento manual (egreso, ajuste, apertura, cierre, ingreso ad-hoc)
export async function crearMovimiento(input: MovimientoCreateInput): Promise<ActionResult> {
  const parsed = movimientoCreateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const auth = await requireAdmin()
  if (!auth.ok) return { ok: false, error: auth.error }
  const { supabase, user } = auth

  const { data, error } = await supabase
    .from("movimientos_caja")
    .insert({
      tipo: parsed.data.tipo,
      origen: parsed.data.origen,
      monto: parsed.data.monto,
      metodo_pago: parsed.data.metodo_pago,
      descripcion: parsed.data.descripcion,
      orden_id: parsed.data.orden_id ?? null,
      created_by: user.id,
    })
    .select("id, id_publico, tipo, monto")
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message ?? "No se pudo registrar el movimiento" }
  }

  // El GASTO específico se implementa en la Ola C.2 (módulo Gastos).
  // Acá solo diferenciamos INGRESO/EGRESO genérico para el historial.
  await logHistorial(supabase, {
    tipo: parsed.data.tipo === "INGRESO" ? TIPO_EVENTO.COBRO : TIPO_EVENTO.GASTO,
    descripcion: `${data.id_publico}: ${parsed.data.tipo} $${parsed.data.monto} · ${parsed.data.descripcion}`,
    entidadTipo: "movimiento_caja",
    entidadId: data.id_publico,
    payload: {
      tipo: parsed.data.tipo,
      origen: parsed.data.origen,
      monto: parsed.data.monto,
      metodo_pago: parsed.data.metodo_pago,
    },
    userId: user.id,
  })

  revalidatePath("/caja")
  redirect("/caja")
}

// ─── Cobrar orden (vía RPC transaccional) ────────────────────────────────
// Se invoca desde la ficha de orden. Registra INGRESO con origen COBRO_ORDEN.
export async function cobrarOrden(input: CobrarOrdenInput): Promise<ActionResult<string>> {
  const parsed = cobrarOrdenSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const auth = await requireAdmin()
  if (!auth.ok) return { ok: false, error: auth.error }
  const { supabase, user } = auth

  // Traer id_publico de la orden para el mensaje de historial
  const { data: orden } = await supabase
    .from("ordenes")
    .select("id_publico")
    .eq("id", parsed.data.orden_id)
    .maybeSingle()
  if (!orden) return { ok: false, error: "Orden no encontrada" }

  const { data: movId, error } = await supabase.rpc("cobrar_orden", {
    p_orden_id: parsed.data.orden_id,
    p_monto: parsed.data.monto,
    p_metodo_pago: parsed.data.metodo_pago,
    p_descripcion: parsed.data.descripcion ?? "",
  })

  if (error || !movId) {
    return { ok: false, error: error?.message ?? "No se pudo registrar el cobro" }
  }

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.COBRO,
    descripcion: `Cobro de ${orden.id_publico}: $${parsed.data.monto} · ${parsed.data.metodo_pago}`,
    entidadTipo: "orden",
    entidadId: orden.id_publico,
    payload: {
      monto: parsed.data.monto,
      metodo_pago: parsed.data.metodo_pago,
      movimiento_id: movId,
    },
    userId: user.id,
  })

  revalidatePath("/caja")
  revalidatePath(`/ordenes/${parsed.data.orden_id}`)
  return { ok: true, data: movId as string }
}
