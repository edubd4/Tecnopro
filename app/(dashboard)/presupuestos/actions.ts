"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import {
  presupuestoCreateSchema,
  presupuestoUpdateSchema,
  cambiarEstadoPresupuestoSchema,
  agregarServicioPresSchema,
  agregarRepuestoPresSchema,
  guardarMensajeSchema,
  type PresupuestoCreateInput,
  type CambiarEstadoPresupuestoInput,
  type AgregarServicioPresInput,
  type AgregarRepuestoPresInput,
  type GuardarMensajeInput,
} from "@/lib/validators/presupuesto"
import { logHistorial } from "@/lib/historial"
import { TIPO_EVENTO } from "@/lib/constants"
import {
  generarMensajePresupuestoTemplate,
  generarMensajePresupuestoIA,
  type DatosMensajePresupuesto,
} from "@/lib/mensaje-presupuesto"
import { hayIADisponible } from "@/lib/anthropic"

type ActionResult<T = void> = { ok: false; error: string } | { ok: true; data?: T }

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

  return { ok: true as const, supabase, user, rol: profile.rol as "admin" | "tecnico" }
}

// ─── Presupuesto ─────────────────────────────────────────────────────────
export async function createPresupuesto(input: PresupuestoCreateInput): Promise<ActionResult> {
  const parsed = presupuestoCreateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const auth = await requireAuth()
  if (!auth.ok) return { ok: false, error: auth.error }
  const { supabase, user } = auth

  const insertPayload: Record<string, unknown> = {
    cliente_id: parsed.data.cliente_id,
    orden_id: parsed.data.orden_id,
    titulo: parsed.data.titulo,
    descripcion: parsed.data.descripcion,
    margen_pct: parsed.data.margen_pct,
    notas_internas: parsed.data.notas_internas,
    created_by: user.id,
    updated_by: user.id,
  }
  if (parsed.data.validez_hasta) {
    insertPayload.validez_hasta = parsed.data.validez_hasta
  }

  const { data, error } = await supabase
    .from("presupuestos")
    .insert(insertPayload)
    .select("id, id_publico")
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message ?? "No se pudo crear el presupuesto" }
  }

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.NUEVO_PRESUPUESTO,
    descripcion: `Nuevo presupuesto ${data.id_publico} · ${parsed.data.titulo}`,
    entidadTipo: "presupuesto",
    entidadId: data.id_publico,
    userId: user.id,
  })

  revalidatePath("/presupuestos")
  redirect(`/presupuestos/${data.id}`)
}

export async function updatePresupuesto(id: string, input: PresupuestoCreateInput): Promise<ActionResult> {
  const parsed = presupuestoUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const auth = await requireAuth()
  if (!auth.ok) return { ok: false, error: auth.error }
  const { supabase, user } = auth

  // validez_hasta es NOT NULL en la DB: en edición la exigimos explícita para
  // no descartar en silencio un campo que el usuario vació.
  if (!parsed.data.validez_hasta) {
    return { ok: false, error: "La fecha de validez es obligatoria" }
  }

  const updatePayload: Record<string, unknown> = {
    cliente_id: parsed.data.cliente_id,
    orden_id: parsed.data.orden_id,
    titulo: parsed.data.titulo,
    descripcion: parsed.data.descripcion,
    validez_hasta: parsed.data.validez_hasta,
    margen_pct: parsed.data.margen_pct,
    notas_internas: parsed.data.notas_internas,
    updated_by: user.id,
  }

  const { data, error } = await supabase
    .from("presupuestos")
    .update(updatePayload)
    .eq("id", id)
    .select("id_publico")
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message ?? "No se pudo actualizar" }
  }

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.NOTA,
    descripcion: `Presupuesto ${data.id_publico} editado`,
    entidadTipo: "presupuesto",
    entidadId: data.id_publico,
    userId: user.id,
  })

  revalidatePath("/presupuestos")
  revalidatePath(`/presupuestos/${id}`)
  return { ok: true }
}

export async function cambiarEstadoPresupuesto(
  id: string,
  input: CambiarEstadoPresupuestoInput,
): Promise<ActionResult> {
  const parsed = cambiarEstadoPresupuestoSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Estado inválido" }

  const auth = await requireAuth()
  if (!auth.ok) return { ok: false, error: auth.error }
  const { supabase, user } = auth

  const { data: current } = await supabase
    .from("presupuestos")
    .select("id_publico, estado")
    .eq("id", id)
    .single()
  if (!current) return { ok: false, error: "Presupuesto no encontrado" }
  if (current.estado === parsed.data.estado) {
    return { ok: false, error: "El presupuesto ya está en ese estado" }
  }

  const { error } = await supabase
    .from("presupuestos")
    .update({ estado: parsed.data.estado, updated_by: user.id })
    .eq("id", id)
  if (error) return { ok: false, error: error.message }

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.CAMBIO_ESTADO_PRESUPUESTO,
    descripcion: `Presupuesto ${current.id_publico}: ${current.estado} → ${parsed.data.estado}`,
    entidadTipo: "presupuesto",
    entidadId: current.id_publico,
    payload: { estado_anterior: current.estado, estado_nuevo: parsed.data.estado },
    userId: user.id,
  })

  revalidatePath("/presupuestos")
  revalidatePath(`/presupuestos/${id}`)
  return { ok: true }
}

// La UI oculta los controles de items cuando el presupuesto está cerrado,
// pero el server tiene que hacer cumplir la misma regla.
async function verificarPresupuestoEditable(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  presupuestoId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data } = await supabase
    .from("presupuestos")
    .select("estado")
    .eq("id", presupuestoId)
    .single()
  if (!data) return { ok: false, error: "Presupuesto no encontrado" }
  if (data.estado === "APROBADO" || data.estado === "RECHAZADO") {
    return {
      ok: false,
      error: "El presupuesto está cerrado (aprobado/rechazado). Para modificarlo, cambiá el estado primero.",
    }
  }
  return { ok: true }
}

// ─── Items · Servicios ──────────────────────────────────────────────────
export async function agregarServicioAPresupuesto(input: AgregarServicioPresInput): Promise<ActionResult> {
  const parsed = agregarServicioPresSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const auth = await requireAuth()
  if (!auth.ok) return { ok: false, error: auth.error }
  const { supabase, user } = auth

  const editable = await verificarPresupuestoEditable(supabase, parsed.data.presupuesto_id)
  if (!editable.ok) return editable

  const { data: srv } = await supabase
    .from("servicios")
    .select("nombre, activo")
    .eq("id", parsed.data.servicio_id)
    .single()
  if (!srv || !srv.activo) return { ok: false, error: "Servicio no encontrado o inactivo" }

  const { error } = await supabase.from("presupuesto_servicios").insert({
    presupuesto_id: parsed.data.presupuesto_id,
    servicio_id: parsed.data.servicio_id,
    descripcion_snapshot: srv.nombre,
    precio: parsed.data.precio,
    cantidad: parsed.data.cantidad,
    created_by: user.id,
  })
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/presupuestos/${parsed.data.presupuesto_id}`)
  return { ok: true }
}

export async function quitarServicioDePresupuesto(itemId: number, presupuestoId: string): Promise<ActionResult> {
  const auth = await requireAuth()
  if (!auth.ok) return { ok: false, error: auth.error }
  const { supabase } = auth

  const editable = await verificarPresupuestoEditable(supabase, presupuestoId)
  if (!editable.ok) return editable

  const { error } = await supabase.from("presupuesto_servicios").delete().eq("id", itemId)
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/presupuestos/${presupuestoId}`)
  return { ok: true }
}

// ─── Items · Repuestos (sin descuento de stock) ─────────────────────────
export async function agregarRepuestoAPresupuesto(input: AgregarRepuestoPresInput): Promise<ActionResult> {
  const parsed = agregarRepuestoPresSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const auth = await requireAuth()
  if (!auth.ok) return { ok: false, error: auth.error }
  const { supabase, user } = auth

  const editable = await verificarPresupuestoEditable(supabase, parsed.data.presupuesto_id)
  if (!editable.ok) return editable

  const { data: rep } = await supabase
    .from("repuestos")
    .select("nombre, costo, activo")
    .eq("id", parsed.data.repuesto_id)
    .single()
  if (!rep || !rep.activo) return { ok: false, error: "Repuesto no encontrado o inactivo" }

  const { error } = await supabase.from("presupuesto_repuestos").insert({
    presupuesto_id: parsed.data.presupuesto_id,
    repuesto_id: parsed.data.repuesto_id,
    descripcion_snapshot: rep.nombre,
    costo_snapshot: rep.costo,
    precio_unitario: parsed.data.precio_unitario,
    cantidad: parsed.data.cantidad,
    created_by: user.id,
  })
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/presupuestos/${parsed.data.presupuesto_id}`)
  return { ok: true }
}

export async function quitarRepuestoDePresupuesto(itemId: number, presupuestoId: string): Promise<ActionResult> {
  const auth = await requireAuth()
  if (!auth.ok) return { ok: false, error: auth.error }
  const { supabase } = auth

  const editable = await verificarPresupuestoEditable(supabase, presupuestoId)
  if (!editable.ok) return editable

  const { error } = await supabase.from("presupuesto_repuestos").delete().eq("id", itemId)
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/presupuestos/${presupuestoId}`)
  return { ok: true }
}

// ─── Mensaje generado ───────────────────────────────────────────────────
// Genera un template con los datos del presupuesto y lo guarda en el campo
// mensaje_generado. En Fase 3, esta función se reemplaza por llamada a IA
// preservando la misma firma.
export async function generarMensajeAutomatico(presupuestoId: string): Promise<ActionResult<string>> {
  const auth = await requireAuth()
  if (!auth.ok) return { ok: false, error: auth.error }
  const { supabase, user } = auth

  // Traer todo lo necesario
  const [presupRes, serviciosRes, repuestosRes, configRes] = await Promise.all([
    supabase
      .from("presupuestos")
      .select(`
        id_publico, titulo, descripcion, validez_hasta,
        clientes:cliente_id ( nombre, apellido, razon_social, tipo )
      `)
      .eq("id", presupuestoId)
      .single(),
    supabase
      .from("presupuesto_servicios")
      .select("descripcion_snapshot, cantidad, precio")
      .eq("presupuesto_id", presupuestoId)
      .order("id", { ascending: true }),
    supabase
      .from("presupuesto_repuestos")
      .select("descripcion_snapshot, cantidad, precio_unitario")
      .eq("presupuesto_id", presupuestoId)
      .order("id", { ascending: true }),
    supabase
      .from("configuracion")
      .select("clave, valor")
      .eq("clave", "negocio_nombre")
      .single(),
  ])

  if (!presupRes.data) return { ok: false, error: "Presupuesto no encontrado" }
  const p = presupRes.data as unknown as {
    id_publico: string
    titulo: string
    descripcion: string | null
    validez_hasta: string
    clientes: { nombre: string; apellido: string | null; razon_social: string | null; tipo: string } | null
  }

  const clienteNombre = p.clientes
    ? p.clientes.tipo === "EMPRESA"
      ? p.clientes.razon_social ?? p.clientes.nombre
      : [p.clientes.nombre, p.clientes.apellido].filter(Boolean).join(" ")
    : "cliente"

  const servicios = (serviciosRes.data ?? []).map((s) => ({
    descripcion: s.descripcion_snapshot,
    cantidad: s.cantidad,
    precio: Number(s.precio),
  }))
  const repuestos = (repuestosRes.data ?? []).map((r) => ({
    descripcion: r.descripcion_snapshot,
    cantidad: r.cantidad,
    precio: Number(r.precio_unitario),
  }))

  const subtotalServicios = servicios.reduce((sum, s) => sum + s.precio * s.cantidad, 0)
  const subtotalRepuestos = repuestos.reduce((sum, r) => sum + r.precio * r.cantidad, 0)
  const total = subtotalServicios + subtotalRepuestos

  const datos: DatosMensajePresupuesto = {
    negocioNombre: (configRes.data?.valor as string | null) ?? "TECNOPRO",
    clienteNombre,
    presupuestoId: p.id_publico,
    titulo: p.titulo,
    descripcion: p.descripcion,
    servicios,
    repuestos,
    subtotalServicios,
    subtotalRepuestos,
    total,
    validezHasta: p.validez_hasta,
  }

  // Intentar generar con IA (Claude Haiku). Si no hay API key o falla, cae
  // al template estático. Ninguno rompe la operación completa.
  let mensaje: string
  let source: "ia" | "template" = "template"
  let tokensInput: number | null = null
  let tokensOutput: number | null = null
  let modelUsado: string | null = null
  let iaError: string | null = null

  if (hayIADisponible()) {
    try {
      const ia = await generarMensajePresupuestoIA(datos)
      mensaje = ia.mensaje
      source = "ia"
      tokensInput = ia.tokensInput
      tokensOutput = ia.tokensOutput
      modelUsado = ia.model
    } catch (err) {
      // No rompemos el flujo — usamos template. Logueamos el error para debug.
      iaError = err instanceof Error ? err.message : String(err)
      console.error("[generarMensajeAutomatico] IA falló, fallback a template:", iaError)
      mensaje = generarMensajePresupuestoTemplate(datos)
    }
  } else {
    mensaje = generarMensajePresupuestoTemplate(datos)
  }

  // Guardar en la DB
  const { error } = await supabase
    .from("presupuestos")
    .update({ mensaje_generado: mensaje, updated_by: user.id })
    .eq("id", presupuestoId)
  if (error) return { ok: false, error: error.message }

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.MENSAJE_IA,
    descripcion: source === "ia"
      ? `Mensaje generado con IA para presupuesto ${p.id_publico}`
      : `Mensaje generado con template para presupuesto ${p.id_publico}`,
    entidadTipo: "presupuesto",
    entidadId: p.id_publico,
    payload: {
      source,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      model: modelUsado,
      ia_error: iaError,
    },
    userId: user.id,
  })

  revalidatePath(`/presupuestos/${presupuestoId}`)
  return { ok: true, data: mensaje }
}

export async function guardarMensajeManual(
  presupuestoId: string,
  input: GuardarMensajeInput,
): Promise<ActionResult> {
  const parsed = guardarMensajeSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Mensaje inválido" }

  const auth = await requireAuth()
  if (!auth.ok) return { ok: false, error: auth.error }
  const { supabase, user } = auth

  const { error } = await supabase
    .from("presupuestos")
    .update({ mensaje_generado: parsed.data.mensaje, updated_by: user.id })
    .eq("id", presupuestoId)
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/presupuestos/${presupuestoId}`)
  return { ok: true }
}
