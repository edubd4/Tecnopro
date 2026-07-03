import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { DashboardShell } from "@/components/nav/DashboardShell"
import { ToastProvider } from "@/components/ui/toast"
import { ConfirmProvider } from "@/components/ui/confirm-dialog"
import { ChatDrawer } from "@/components/chat/ChatDrawer"
import { NAV, filterNavByRol } from "@/lib/nav"
import { ROL, type Rol } from "@/lib/constants"
import { hayIADisponible } from "@/lib/anthropic"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nombre, rol")
    .eq("id", user.id)
    .single()

  const userDisplay = profile?.nombre ?? user.email ?? "usuario"
  const userRol = profile?.rol ?? "sin rol"
  const navGroups = filterNavByRol(NAV, profile?.rol as Rol | undefined)
  // Fase 3.3: chat con IA solo para admin y solo si la API key está configurada.
  const mostrarChat = profile?.rol === ROL.ADMIN && hayIADisponible()

  return (
    <ToastProvider>
      <ConfirmProvider>
        <DashboardShell navGroups={navGroups} userDisplay={userDisplay} userRol={userRol}>
          {children}
        </DashboardShell>
        {mostrarChat && <ChatDrawer />}
      </ConfirmProvider>
    </ToastProvider>
  )
}
