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

  revalidatePath("/ordenes")
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
