"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import {
  turnoCreateSchema,
  turnoUpdateSchema,
  cambiarEstadoTurnoSchema,
  type TurnoCreateInput,
  type CambiarEstadoTurnoInput,
} from "@/lib/validators/turno"
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

  return { ok: true as const, supabase, user, rol: profile.rol as "admin" | "tecnico" }
}

async function detectarOverlap(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  tecnicoId: string | null | undefined,
  fechaInicio: string,
  fechaFin: string,
  excludeId?: string | null,
) {
  if (!tecnicoId) return null

  const { data, error } = await supabase.rpc("turnos_overlap_for_tecnico", {
    p_tecnico_id: tecnicoId,
    p_fecha_inicio: fechaInicio,
    p_fecha_fin: fechaFin,
    p_exclude_id: excludeId ?? null,
  })
  if (error) return null
  if (!data || data.length === 0) return null
  return data[0] as { id_publico: string; titulo: string; fecha_inicio: string; fecha_fin: string }
}

export async function createTurno(input: TurnoCreateInput): Promise<ActionResult> {
  const parsed = turnoCreateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const auth = await requireAuth()
  if (!auth.ok) return { ok: false, error: auth.error }
  const { supabase, user } = auth

  // Detectar overlap con otros turnos del mismo técnico
  const overlap = await detectarOverlap(
    supabase,
    parsed.data.tecnico_id ?? null,
    parsed.data.fecha_inicio,
    parsed.data.fecha_fin,
  )
  if (overlap) {
    return {
      ok: false,
      error: `El técnico ya tiene un turno solapado: ${overlap.id_publico} · ${overlap.titulo}`,
    }
  }

  const { data, error } = await supabase
    .from("turnos")
    .insert({
      ...parsed.data,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id, id_publico")
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message ?? "No se pudo crear el turno" }
  }

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.TURNO_ASIGNADO,
    descripcion: `Turno ${data.id_publico} · ${parsed.data.titulo}`,
    entidadTipo: "turno",
    entidadId: data.id_publico,
    payload: { fecha_inicio: parsed.data.fecha_inicio, fecha_fin: parsed.data.fecha_fin },
    userId: user.id,
  })

  revalidatePath("/turnos")
  redirect(`/turnos/${data.id}`)
}

export async function updateTurno(id: string, input: TurnoCreateInput): Promise<ActionResult> {
  const parsed = turnoUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const auth = await requireAuth()
  if (!auth.ok) return { ok: false, error: auth.error }
  const { supabase, user } = auth

  const overlap = await detectarOverlap(
    supabase,
    parsed.data.tecnico_id ?? null,
    parsed.data.fecha_inicio,
    parsed.data.fecha_fin,
    id,
  )
  if (overlap) {
    return {
      ok: false,
      error: `El técnico ya tiene un turno solapado: ${overlap.id_publico} · ${overlap.titulo}`,
    }
  }

  const { data, error } = await supabase
    .from("turnos")
    .update({ ...parsed.data, updated_by: user.id })
    .eq("id", id)
    .select("id_publico")
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message ?? "No se pudo actualizar" }
  }

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.NOTA,
    descripcion: `Turno ${data.id_publico} editado`,
    entidadTipo: "turno",
    entidadId: data.id_publico,
    userId: user.id,
  })

  revalidatePath("/turnos")
  revalidatePath(`/turnos/${id}`)
  return { ok: true }
}

export async function cambiarEstadoTurno(
  id: string,
  input: CambiarEstadoTurnoInput,
): Promise<ActionResult> {
  const parsed = cambiarEstadoTurnoSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Estado inválido" }
  }

  const auth = await requireAuth()
  if (!auth.ok) return { ok: false, error: auth.error }
  const { supabase, user } = auth

  const { data: current } = await supabase
    .from("turnos")
    .select("id_publico, estado")
    .eq("id", id)
    .single()
  if (!current) return { ok: false, error: "Turno no encontrado" }
  if (current.estado === parsed.data.estado) {
    return { ok: false, error: "El turno ya está en ese estado" }
  }

  const { error } = await supabase
    .from("turnos")
    .update({ estado: parsed.data.estado, updated_by: user.id })
    .eq("id", id)
  if (error) return { ok: false, error: error.message }

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.NOTA,
    descripcion: `Turno ${current.id_publico}: ${current.estado} → ${parsed.data.estado}`,
    entidadTipo: "turno",
    entidadId: current.id_publico,
    payload: { estado_anterior: current.estado, estado_nuevo: parsed.data.estado },
    userId: user.id,
  })

  revalidatePath("/turnos")
  revalidatePath(`/turnos/${id}`)
  return { ok: true }
}
