"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import {
  gastoCreateSchema,
  type GastoCreateInput,
} from "@/lib/validators/gasto"
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
    return { ok: false as const, error: "Solo administradores pueden registrar gastos" }
  }

  return { ok: true as const, supabase, user }
}

// ─── Registrar gasto (via RPC transaccional) ───────────────────────────────
// El RPC crea EGRESO en caja + fila en gastos en la misma transaccion.
export async function crearGasto(input: GastoCreateInput): Promise<ActionResult> {
  const parsed = gastoCreateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const auth = await requireAdmin()
  if (!auth.ok) return { ok: false, error: auth.error }
  const { supabase, user } = auth

  const { data: gastoId, error } = await supabase.rpc("registrar_gasto", {
    p_categoria_id: parsed.data.categoria_id,
    p_monto: parsed.data.monto,
    p_descripcion: parsed.data.descripcion,
    p_fecha: parsed.data.fecha ?? null,
    p_metodo_pago: parsed.data.metodo_pago,
    p_notas: parsed.data.notas ?? null,
  })

  if (error || !gastoId) {
    return { ok: false, error: error?.message ?? "No se pudo registrar el gasto" }
  }

  // Traer id_publico del gasto para el log de historial
  const { data: gasto } = await supabase
    .from("gastos")
    .select("id_publico, categoria:categoria_id(nombre)")
    .eq("id", gastoId as string)
    .maybeSingle()

  // Supabase infiere el join como array; casteamos via unknown para evitar
  // el "may be a mistake" del TS check.
  const categoriaJoin = gasto?.categoria as unknown as { nombre: string } | null
  const categoriaNombre = categoriaJoin?.nombre ?? "—"

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.GASTO,
    descripcion: `${gasto?.id_publico ?? "GST-?"}: ${categoriaNombre} · $${parsed.data.monto} · ${parsed.data.descripcion}`,
    entidadTipo: "gasto",
    entidadId: gasto?.id_publico ?? undefined,
    payload: {
      categoria_id: parsed.data.categoria_id,
      monto: parsed.data.monto,
      metodo_pago: parsed.data.metodo_pago,
    },
    userId: user.id,
  })

  // Revalidar /gastos y /caja (el egreso aparece en ambos)
  revalidatePath("/gastos")
  revalidatePath("/caja")
  redirect("/caja")
}
