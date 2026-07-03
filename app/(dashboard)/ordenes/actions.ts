"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth-guards"
import {
  ordenCreateSchema,
  ordenUpdateSchema,
  cambiarEstadoSchema,
  type OrdenCreateInput,
  type OrdenUpdateInput,
  type CambiarEstadoInput,
} from "@/lib/validators/orden"
import { logHistorial } from "@/lib/historial"
import { ROL, TIPO_EVENTO } from "@/lib/constants"
import {
  estadoGeneraAviso,
  generarAvisoOrdenIA,
  generarAvisoOrdenTemplate,
  type DatosAvisoOrden,
} from "@/lib/aviso-orden"
import { hayIADisponible } from "@/lib/anthropic"

type ActionResult = { ok: false; error: string } | { ok: true }

// Helper: requiere autenticado con profile activo (admin o tecnico). RLS filtra
// que orden puede tocar cada rol; aca solo aseguramos que hay sesion.
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

export async function createOrden(input: OrdenCreateInput): Promise<ActionResult> {
  const parsed = ordenCreateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const auth = await requireAuth()
  if (!auth.ok) return { ok: false, error: auth.error }
  const { supabase, user } = auth

  const { data, error } = await supabase
    .from("ordenes")
    .insert({
      ...parsed.data,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id, id_publico")
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message ?? "No se pudo crear la orden" }
  }

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.NUEVO_CLIENTE,     // reutilizo tipo NOTA para creaciones
    descripcion: `Nueva orden ${data.id_publico}`,
    entidadTipo: "orden",
    entidadId: data.id_publico,
    payload: { prioridad: parsed.data.prioridad, tecnico: parsed.data.tecnico_asignado_id },
    userId: user.id,
  })

  revalidatePath("/ordenes")
  redirect(`/ordenes/${data.id}`)
}

export async function updateOrden(id: string, input: OrdenUpdateInput): Promise<ActionResult> {
  const parsed = ordenUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const auth = await requireAuth()
  if (!auth.ok) return { ok: false, error: auth.error }
  const { supabase, user } = auth

  const { data, error } = await supabase
    .from("ordenes")
    .update({ ...parsed.data, updated_by: user.id })
    .eq("id", id)
    .select("id_publico")
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message ?? "No se pudo actualizar" }
  }

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.NOTA,
    descripcion: `Orden ${data.id_publico} editada`,
    entidadTipo: "orden",
    entidadId: data.id_publico,
    userId: user.id,
  })

  revalidatePath("/ordenes")
  revalidatePath(`/ordenes/${id}`)
  return { ok: true }
}

export async function cambiarEstadoOrden(
  id: string,
  input: CambiarEstadoInput,
): Promise<ActionResult> {
  const parsed = cambiarEstadoSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Estado inválido" }
  }

  const auth = await requireAuth()
  if (!auth.ok) return { ok: false, error: auth.error }
  const { supabase, user } = auth

  const { data: current, error: readErr } = await supabase
    .from("ordenes")
    .select("id_publico, estado")
    .eq("id", id)
    .single()
  if (readErr || !current) return { ok: false, error: "Orden no encontrada" }

  if (current.estado === parsed.data.estado) {
    return { ok: false, error: "La orden ya está en ese estado" }
  }

  const { error } = await supabase
    .from("ordenes")
    .update({ estado: parsed.data.estado, updated_by: user.id })
    .eq("id", id)

  if (error) return { ok: false, error: error.message }

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.CAMBIO_ESTADO_ORDEN,
    descripcion: `Orden ${current.id_publico}: ${current.estado} → ${parsed.data.estado}`,
    entidadTipo: "orden",
    entidadId: current.id_publico,
    payload: { estado_anterior: current.estado, estado_nuevo: parsed.data.estado },
    userId: user.id,
  })

  // Fase 3.2 — Auto-generar aviso para el cliente si el nuevo estado lo amerita.
  // Corre en background del action; si falla, no se rompe el cambio de estado.
  if (estadoGeneraAviso(parsed.data.estado)) {
    await generarYGuardarAviso(supabase, id, current.estado, parsed.data.estado, user.id)
  }

  revalidatePath("/ordenes")
  revalidatePath(`/ordenes/${id}`)
  return { ok: true }
}

/**
 * Genera y guarda el aviso al cliente para el estado nuevo. Intenta IA con
 * fallback a template. Errores se loguean pero NO fallan el cambio de estado.
 */
async function generarYGuardarAviso(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  ordenId: string,
  estadoAnterior: string,
  estadoNuevo: string,
  userId: string,
): Promise<void> {
  try {
    // Traemos todo lo que necesita el prompt
    const [ordenRes, configRes, presupuestoRes] = await Promise.all([
      supabase
        .from("ordenes")
        .select(`
          id_publico, equipo_desc, fecha_entrega_estimada,
          clientes:cliente_id ( nombre, apellido, razon_social, tipo ),
          tecnico:tecnico_asignado_id ( nombre )
        `)
        .eq("id", ordenId)
        .single(),
      supabase
        .from("configuracion")
        .select("valor")
        .eq("clave", "negocio_nombre")
        .maybeSingle(),
      supabase
        .from("presupuestos")
        .select("id_publico")
        .eq("orden_id", ordenId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (!ordenRes.data) return
    const o = ordenRes.data as unknown as {
      id_publico: string
      equipo_desc: string | null
      fecha_entrega_estimada: string | null
      clientes: { nombre: string; apellido: string | null; razon_social: string | null; tipo: string } | null
      tecnico: { nombre: string } | null
    }

    const clienteNombre = o.clientes
      ? o.clientes.tipo === "EMPRESA"
        ? (o.clientes.razon_social ?? o.clientes.nombre)
        : [o.clientes.nombre, o.clientes.apellido].filter(Boolean).join(" ")
      : "cliente"

    const datos: DatosAvisoOrden = {
      negocioNombre: (configRes.data?.valor as string | null) ?? "TECNOPRO",
      clienteNombre,
      ordenIdPublico: o.id_publico,
      equipoDesc: o.equipo_desc,
      estadoAnterior,
      estadoNuevo,
      presupuestoIdPublico: presupuestoRes.data?.id_publico ?? null,
      fechaEntregaEstimada: o.fecha_entrega_estimada,
      tecnicoNombre: o.tecnico?.nombre ?? null,
    }

    let mensaje: string
    let source: "ia" | "template" = "template"
    let tokensInput: number | null = null
    let tokensOutput: number | null = null
    let modelUsado: string | null = null

    if (hayIADisponible()) {
      try {
        const ia = await generarAvisoOrdenIA(datos)
        mensaje = ia.mensaje
        source = "ia"
        tokensInput = ia.tokensInput
        tokensOutput = ia.tokensOutput
        modelUsado = ia.model
      } catch (err) {
        console.error("[cambiarEstadoOrden] IA falló, fallback a template:", err)
        mensaje = generarAvisoOrdenTemplate(datos)
      }
    } else {
      mensaje = generarAvisoOrdenTemplate(datos)
    }

    await supabase
      .from("ordenes")
      .update({
        mensaje_estado_generado: mensaje,
        mensaje_estado_para: estadoNuevo,
      })
      .eq("id", ordenId)

    await logHistorial(supabase, {
      tipo: TIPO_EVENTO.MENSAJE_IA,
      descripcion: `Aviso ${source === "ia" ? "IA" : "template"} generado para orden ${o.id_publico} (${estadoNuevo})`,
      entidadTipo: "orden",
      entidadId: o.id_publico,
      payload: {
        source,
        estado_para: estadoNuevo,
        tokens_input: tokensInput,
        tokens_output: tokensOutput,
        model: modelUsado,
      },
      userId,
    })
  } catch (err) {
    // Nunca rompemos el cambio de estado por un fallo en la generación de aviso.
    console.error("[generarYGuardarAviso] error inesperado:", err)
  }
}

/**
 * Regenera manualmente el aviso para el estado actual de la orden.
 * Útil cuando el user quiere una variante nueva o el aviso está desactualizado.
 */
export async function regenerarAvisoOrden(id: string): Promise<ActionResult> {
  const auth = await requireAuth()
  if (!auth.ok) return { ok: false, error: auth.error }
  const { supabase, user } = auth

  const { data: current } = await supabase
    .from("ordenes")
    .select("estado")
    .eq("id", id)
    .single()
  if (!current) return { ok: false, error: "Orden no encontrada" }

  if (!estadoGeneraAviso(current.estado)) {
    return { ok: false, error: "El estado actual no genera aviso" }
  }

  await generarYGuardarAviso(supabase, id, current.estado, current.estado, user.id)
  revalidatePath(`/ordenes/${id}`)
  return { ok: true }
}

export async function asignarTecnicoOrden(id: string, tecnicoId: string | null): Promise<ActionResult> {
  // Cambio de asignacion: solo admin (regla de negocio).
  const guard = await requireAdmin()
  if (!guard.ok) return { ok: false, error: guard.error }
  const { supabase, user } = guard

  if (tecnicoId) {
    // Verificar que el user existe, es tecnico o admin, y esta activo
    const { data: tec } = await supabase
      .from("profiles")
      .select("nombre, rol, activo")
      .eq("id", tecnicoId)
      .single()
    if (!tec || !tec.activo) {
      return { ok: false, error: "Técnico no encontrado o inactivo" }
    }
    if (tec.rol !== ROL.TECNICO && tec.rol !== ROL.ADMIN) {
      return { ok: false, error: "El usuario asignado no puede tomar órdenes" }
    }
  }

  const { data: current } = await supabase
    .from("ordenes")
    .select("id_publico, tecnico_asignado_id")
    .eq("id", id)
    .single()
  if (!current) return { ok: false, error: "Orden no encontrada" }

  const { error } = await supabase
    .from("ordenes")
    .update({ tecnico_asignado_id: tecnicoId, updated_by: user.id })
    .eq("id", id)
  if (error) return { ok: false, error: error.message }

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.TURNO_ASIGNADO,     // reusamos tipo TURNO_ASIGNADO para asignaciones
    descripcion: tecnicoId
      ? `Orden ${current.id_publico} asignada a técnico ${tecnicoId}`
      : `Orden ${current.id_publico} sin asignación`,
    entidadTipo: "orden",
    entidadId: current.id_publico,
    payload: { tecnico_anterior: current.tecnico_asignado_id, tecnico_nuevo: tecnicoId },
    userId: user.id,
  })

  revalidatePath("/ordenes")
  revalidatePath(`/ordenes/${id}`)
  return { ok: true }
}
