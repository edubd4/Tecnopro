"use server"

import { revalidatePath } from "next/cache"
import { createServerClient } from "@/lib/supabase/server"
import {
  agregarServicioSchema,
  agregarRepuestoSchema,
  type AgregarServicioInput,
  type AgregarRepuestoInput,
} from "@/lib/validators/orden-item"
import { logHistorial } from "@/lib/historial"
import { TIPO_EVENTO } from "@/lib/constants"

type ActionResult = { ok: false; error: string } | { ok: true }

async function requireAuth() {
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

  return { ok: true as const, supabase, user }
}

// ─── Servicios imputados ─────────────────────────────────────────────────
export async function agregarServicioAOrden(input: AgregarServicioInput): Promise<ActionResult> {
  const parsed = agregarServicioSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const auth = await requireAuth()
  if (!auth.ok) return { ok: false, error: auth.error }
  const { supabase, user } = auth

  // Snapshot del nombre del servicio
  const { data: srv } = await supabase
    .from("servicios")
    .select("nombre, id_publico, activo")
    .eq("id", parsed.data.servicio_id)
    .single()
  if (!srv || !srv.activo) {
    return { ok: false, error: "Servicio no encontrado o inactivo" }
  }

  const { error } = await supabase.from("orden_servicios").insert({
    orden_id: parsed.data.orden_id,
    servicio_id: parsed.data.servicio_id,
    descripcion_snapshot: srv.nombre,
    precio: parsed.data.precio,
    cantidad: parsed.data.cantidad,
    created_by: user.id,
  })
  if (error) return { ok: false, error: error.message }

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.NOTA,
    descripcion: `Servicio ${srv.id_publico} × ${parsed.data.cantidad} imputado`,
    entidadTipo: "orden",
    entidadId: parsed.data.orden_id,
    payload: { servicio_id: parsed.data.servicio_id, cantidad: parsed.data.cantidad, precio: parsed.data.precio },
    userId: user.id,
  })

  revalidatePath(`/ordenes/${parsed.data.orden_id}`)
  return { ok: true }
}

export async function quitarServicioDeOrden(itemId: number, ordenId: string): Promise<ActionResult> {
  const auth = await requireAuth()
  if (!auth.ok) return { ok: false, error: auth.error }
  const { supabase, user } = auth

  const { data: current } = await supabase
    .from("orden_servicios")
    .select("descripcion_snapshot, cantidad, precio, orden_id")
    .eq("id", itemId)
    .single()
  if (!current) return { ok: false, error: "Ítem no encontrado" }

  const { error } = await supabase.from("orden_servicios").delete().eq("id", itemId)
  if (error) return { ok: false, error: error.message }

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.NOTA,
    descripcion: `Servicio "${current.descripcion_snapshot}" × ${current.cantidad} removido de la orden`,
    entidadTipo: "orden",
    entidadId: ordenId,
    payload: current,
    userId: user.id,
  })

  revalidatePath(`/ordenes/${ordenId}`)
  return { ok: true }
}

// ─── Repuestos imputados (via RPC transaccional) ─────────────────────────
export async function agregarRepuestoAOrden(input: AgregarRepuestoInput): Promise<ActionResult> {
  const parsed = agregarRepuestoSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const auth = await requireAuth()
  if (!auth.ok) return { ok: false, error: auth.error }
  const { supabase, user } = auth

  // El RPC hace INSERT en repuestos_movimientos (SALIDA) + INSERT en orden_repuestos
  // en una sola transaccion. Si el stock no alcanza, el trigger de stock revierte todo.
  const { error, data } = await supabase.rpc("imputar_repuesto_a_orden", {
    p_orden_id: parsed.data.orden_id,
    p_repuesto_id: parsed.data.repuesto_id,
    p_cantidad: parsed.data.cantidad,
    p_precio_unitario: parsed.data.precio_unitario,
  })

  if (error) return { ok: false, error: error.message }

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.STOCK_MOVIMIENTO,
    descripcion: `Repuesto × ${parsed.data.cantidad} imputado a la orden (SALIDA de stock)`,
    entidadTipo: "orden",
    entidadId: parsed.data.orden_id,
    payload: {
      repuesto_id: parsed.data.repuesto_id,
      cantidad: parsed.data.cantidad,
      precio_unitario: parsed.data.precio_unitario,
      orden_repuesto_id: data,
    },
    userId: user.id,
  })

  revalidatePath(`/ordenes/${parsed.data.orden_id}`)
  revalidatePath("/stock")
  return { ok: true }
}

export async function quitarRepuestoDeOrden(itemId: number, ordenId: string): Promise<ActionResult> {
  const auth = await requireAuth()
  if (!auth.ok) return { ok: false, error: auth.error }
  const { supabase, user } = auth

  const { data: current } = await supabase
    .from("orden_repuestos")
    .select("descripcion_snapshot, cantidad, precio_unitario")
    .eq("id", itemId)
    .single()

  const { error } = await supabase.rpc("desimputar_repuesto_de_orden", {
    p_orden_repuesto_id: itemId,
  })
  if (error) return { ok: false, error: error.message }

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.STOCK_MOVIMIENTO,
    descripcion: `Repuesto "${current?.descripcion_snapshot}" × ${current?.cantidad} devuelto (ENTRADA de stock)`,
    entidadTipo: "orden",
    entidadId: ordenId,
    payload: current ?? undefined,
    userId: user.id,
  })

  revalidatePath(`/ordenes/${ordenId}`)
  revalidatePath("/stock")
  return { ok: true }
}
