"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { clienteSchema, type ClienteInput } from "@/lib/validators/cliente"
import { logHistorial } from "@/lib/historial"
import { ROL, TIPO_EVENTO } from "@/lib/constants"

type ActionResult = { ok: false; error: string } | { ok: true }

async function requireAdmin() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { supabase, user: null, error: "No autenticado" as const }

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, activo")
    .eq("id", user.id)
    .single()

  if (!profile?.activo || profile.rol !== ROL.ADMIN) {
    return { supabase, user, error: "Solo un admin puede realizar esta acción" as const }
  }
  return { supabase, user, error: null as const }
}

export async function createCliente(input: ClienteInput): Promise<ActionResult> {
  const parsed = clienteSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const { supabase, user, error: guardError } = await requireAdmin()
  if (guardError) return { ok: false, error: guardError }

  const { data, error } = await supabase
    .from("clientes")
    .insert({
      ...parsed.data,
      created_by: user!.id,
      updated_by: user!.id,
    })
    .select("id, id_publico, nombre, apellido, razon_social")
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message ?? "No se pudo crear el cliente" }
  }

  const nombreVisible =
    parsed.data.tipo === "EMPRESA"
      ? parsed.data.razon_social ?? parsed.data.nombre
      : [parsed.data.nombre, parsed.data.apellido].filter(Boolean).join(" ")

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.NUEVO_CLIENTE,
    descripcion: `Cliente ${data.id_publico} · ${nombreVisible}`,
    entidadTipo: "cliente",
    entidadId: data.id_publico,
    payload: { tipo: parsed.data.tipo },
    userId: user!.id,
  })

  revalidatePath("/clientes")
  redirect(`/clientes/${data.id}`)
}

export async function updateCliente(id: string, input: ClienteInput): Promise<ActionResult> {
  const parsed = clienteSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const { supabase, user, error: guardError } = await requireAdmin()
  if (guardError) return { ok: false, error: guardError }

  const { data, error } = await supabase
    .from("clientes")
    .update({
      ...parsed.data,
      updated_by: user!.id,
    })
    .eq("id", id)
    .select("id_publico")
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message ?? "No se pudo actualizar" }
  }

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.NOTA,
    descripcion: `Cliente ${data.id_publico} editado`,
    entidadTipo: "cliente",
    entidadId: data.id_publico,
    userId: user!.id,
  })

  revalidatePath("/clientes")
  revalidatePath(`/clientes/${id}`)
  return { ok: true }
}

export async function toggleClienteEstado(id: string): Promise<ActionResult> {
  const { supabase, user, error: guardError } = await requireAdmin()
  if (guardError) return { ok: false, error: guardError }

  const { data: current, error: readErr } = await supabase
    .from("clientes")
    .select("estado, id_publico")
    .eq("id", id)
    .single()
  if (readErr || !current) return { ok: false, error: "Cliente no encontrado" }

  const nuevo = current.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO"

  const { error } = await supabase
    .from("clientes")
    .update({ estado: nuevo, updated_by: user!.id })
    .eq("id", id)

  if (error) return { ok: false, error: error.message }

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.NOTA,
    descripcion: `Cliente ${current.id_publico} marcado como ${nuevo}`,
    entidadTipo: "cliente",
    entidadId: current.id_publico,
    payload: { estado_anterior: current.estado, estado_nuevo: nuevo },
    userId: user!.id,
  })

  revalidatePath("/clientes")
  revalidatePath(`/clientes/${id}`)
  return { ok: true }
}
