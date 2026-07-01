"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth-guards"
import { servicioSchema, type ServicioInput } from "@/lib/validators/servicio"
import { logHistorial } from "@/lib/historial"
import { TIPO_EVENTO } from "@/lib/constants"

type ActionResult = { ok: false; error: string } | { ok: true }

export async function createServicio(input: ServicioInput): Promise<ActionResult> {
  const parsed = servicioSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const guard = await requireAdmin()
  if (!guard.ok) return { ok: false, error: guard.error }
  const { supabase, user } = guard

  const { data, error } = await supabase
    .from("servicios")
    .insert({
      ...parsed.data,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id, id_publico, nombre")
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message ?? "No se pudo crear el servicio" }
  }

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.NOTA,
    descripcion: `Nuevo servicio ${data.id_publico} · ${data.nombre}`,
    entidadTipo: "servicio",
    entidadId: data.id_publico,
    userId: user.id,
  })

  revalidatePath("/catalogo")
  redirect(`/catalogo/${data.id}`)
}

export async function updateServicio(id: string, input: ServicioInput): Promise<ActionResult> {
  const parsed = servicioSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const guard = await requireAdmin()
  if (!guard.ok) return { ok: false, error: guard.error }
  const { supabase, user } = guard

  const { data, error } = await supabase
    .from("servicios")
    .update({ ...parsed.data, updated_by: user.id })
    .eq("id", id)
    .select("id_publico")
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message ?? "No se pudo actualizar" }
  }

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.NOTA,
    descripcion: `Servicio ${data.id_publico} editado`,
    entidadTipo: "servicio",
    entidadId: data.id_publico,
    userId: user.id,
  })

  revalidatePath("/catalogo")
  revalidatePath(`/catalogo/${id}`)
  return { ok: true }
}

export async function toggleServicioActivo(id: string): Promise<ActionResult> {
  const guard = await requireAdmin()
  if (!guard.ok) return { ok: false, error: guard.error }
  const { supabase, user } = guard

  const { data: current, error: readErr } = await supabase
    .from("servicios")
    .select("activo, id_publico")
    .eq("id", id)
    .single()
  if (readErr || !current) return { ok: false, error: "Servicio no encontrado" }

  const nuevoActivo = !current.activo

  const { error } = await supabase
    .from("servicios")
    .update({ activo: nuevoActivo, updated_by: user.id })
    .eq("id", id)
  if (error) return { ok: false, error: error.message }

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.NOTA,
    descripcion: `Servicio ${current.id_publico} ${nuevoActivo ? "reactivado" : "desactivado"}`,
    entidadTipo: "servicio",
    entidadId: current.id_publico,
    payload: { activo_anterior: current.activo, activo_nuevo: nuevoActivo },
    userId: user.id,
  })

  revalidatePath("/catalogo")
  revalidatePath(`/catalogo/${id}`)
  return { ok: true }
}
