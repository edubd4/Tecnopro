import type { SupabaseClient, User } from "@supabase/supabase-js"
import { createServerClient } from "@/lib/supabase/server"
import { ROL } from "@/lib/constants"

type AdminGuardOk = {
  supabase: SupabaseClient
  user: User
  error: null
}
type AdminGuardFail = {
  supabase: SupabaseClient | null
  user: User | null
  error: string
}

// Guard reusable para server actions que solo pueden ejecutar admins.
// Devuelve el cliente y el user si pasa; string de error si no.
export async function requireAdmin(): Promise<AdminGuardOk | AdminGuardFail> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { supabase, user: null, error: "No autenticado" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, activo")
    .eq("id", user.id)
    .single()

  if (!profile?.activo || profile.rol !== ROL.ADMIN) {
    return { supabase, user, error: "Solo un admin puede realizar esta acción" }
  }
  return { supabase, user, error: null }
}
