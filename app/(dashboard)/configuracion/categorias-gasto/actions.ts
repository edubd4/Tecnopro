"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createServerClient } from "@/lib/supabase/server"
import { logHistorial } from "@/lib/historial"
import { TIPO_EVENTO } from "@/lib/constants"

type ActionResult = { ok: false; error: string } | { ok: true }

async function requireAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "No autenticado" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, activo")
    .eq("id", user.id)
    .single()
  if (!profile?.activo) return { ok: false as const, error: "Usuario inactivo" }
  if (profile.rol !== "admin") return { ok: false as const, error: "Solo administradores" }

  return { ok: true as const, supabase, user }
}

const nombreSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : v),
  z.string().min(1, "El nombre es obligatorio").max(100),
)

// ─── Crear ──────────────────────────────────────────────────────────────
export async function crearCategoriaGasto(nombre: string): Promise<ActionResult> {
  const parsed = nombreSchema.safeParse(nombre)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Nombre inválido" }
  }

  const auth = await requireAdmin()
  if (!auth.ok) return { ok: false, error: auth.error }
  const { supabase, user } = auth

  // Verificamos que no exista ya (case-insensitive)
  const { data: existente } = await supabase
    .from("categorias_gasto")
    .select("id")
    .ilike("nombre", parsed.data)
    .maybeSingle()
  if (existente) {
    return { ok: false, error: `Ya existe una categoría con ese nombre` }
  }

  // Calculamos el "orden" siguiente (max + 10)
  const { data: last } = await supabase
    .from("categorias_gasto")
    .select("orden")
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle()
  const nuevoOrden = ((last?.orden as number | undefined) ?? 0) + 10

  const { error } = await supabase
    .from("categorias_gasto")
    .insert({ nombre: parsed.data, orden: nuevoOrden, activo: true })
  if (error) return { ok: false, error: error.message }

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.NOTA,
    descripcion: `Nueva categoría de gasto: "${parsed.data}"`,
    entidadTipo: "categoria_gasto",
    userId: user.id,
  })

  revalidatePath("/configuracion/categorias-gasto")
  revalidatePath("/gastos")
  revalidatePath("/gastos/nuevo")
  return { ok: true }
}

// ─── Renombrar ──────────────────────────────────────────────────────────
export async function renombrarCategoriaGasto(id: number, nombre: string): Promise<ActionResult> {
  const parsed = nombreSchema.safeParse(nombre)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Nombre inválido" }
  }

  const auth = await requireAdmin()
  if (!auth.ok) return { ok: false, error: auth.error }
  const { supabase, user } = auth

  // Verificamos que no colisione con otra categoría
  const { data: existente } = await supabase
    .from("categorias_gasto")
    .select("id")
    .ilike("nombre", parsed.data)
    .neq("id", id)
    .maybeSingle()
  if (existente) {
    return { ok: false, error: `Ya existe otra categoría con ese nombre` }
  }

  const { data: original } = await supabase
    .from("categorias_gasto")
    .select("nombre")
    .eq("id", id)
    .maybeSingle()

  const { error } = await supabase
    .from("categorias_gasto")
    .update({ nombre: parsed.data })
    .eq("id", id)
  if (error) return { ok: false, error: error.message }

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.NOTA,
    descripcion: `Categoría de gasto renombrada: "${original?.nombre ?? "?"}" → "${parsed.data}"`,
    entidadTipo: "categoria_gasto",
    userId: user.id,
  })

  revalidatePath("/configuracion/categorias-gasto")
  revalidatePath("/gastos")
  revalidatePath("/gastos/nuevo")
  return { ok: true }
}

// ─── Toggle activo/inactivo ─────────────────────────────────────────────
// No borramos categorías con gastos históricos — solo las desactivamos.
export async function toggleCategoriaGasto(id: number): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { ok: false, error: auth.error }
  const { supabase, user } = auth

  const { data: current } = await supabase
    .from("categorias_gasto")
    .select("nombre, activo")
    .eq("id", id)
    .maybeSingle()
  if (!current) return { ok: false, error: "Categoría no encontrada" }

  const nuevoActivo = !current.activo

  const { error } = await supabase
    .from("categorias_gasto")
    .update({ activo: nuevoActivo })
    .eq("id", id)
  if (error) return { ok: false, error: error.message }

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.NOTA,
    descripcion: `Categoría de gasto "${current.nombre}" ${nuevoActivo ? "reactivada" : "desactivada"}`,
    entidadTipo: "categoria_gasto",
    userId: user.id,
  })

  revalidatePath("/configuracion/categorias-gasto")
  revalidatePath("/gastos")
  revalidatePath("/gastos/nuevo")
  return { ok: true }
}
