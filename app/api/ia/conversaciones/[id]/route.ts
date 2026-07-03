import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

// GET /api/ia/conversaciones/[id]
// Devuelve los mensajes de la conversación (ordenados asc).
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
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

  // Verificar propiedad (RLS también filtra pero devolvemos 404 explícito).
  const { data: conv } = await supabase
    .from("chat_conversaciones")
    .select("id, titulo, user_id")
    .eq("id", params.id)
    .maybeSingle()
  if (!conv || conv.user_id !== user.id) {
    return NextResponse.json({ ok: false, error: "Conversación no encontrada" }, { status: 404 })
  }

  const { data: mensajes, error } = await supabase
    .from("chat_mensajes")
    .select("id, rol, contenido, created_at")
    .eq("conversacion_id", params.id)
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    data: {
      id: conv.id,
      titulo: conv.titulo,
      mensajes: mensajes ?? [],
    },
  })
}
