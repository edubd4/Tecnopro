import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

// GET /api/ia/conversaciones
// Lista las últimas 20 conversaciones del user admin (no archivadas).
export async function GET() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 })
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, activo")
    .eq("id", user.id)
    .single()
  if (!profile?.activo || profile.rol !== "admin") {
    return NextResponse.json({ ok: false, error: "Solo administradores" }, { status: 403 })
  }

  const { data, error } = await supabase
    .from("chat_conversaciones")
    .select("id, titulo, created_at, updated_at")
    .eq("user_id", user.id)
    .eq("archivada", false)
    .order("updated_at", { ascending: false })
    .limit(20)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, data: data ?? [] })
}
