import Link from "next/link"
import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { SignOutButton } from "@/components/SignOutButton"

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

  return (
    <div className="min-h-screen bg-tp-bg text-tp-text">
      <header className="border-b border-tp-line-soft bg-tp-surface-low/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 md:px-10 py-3">
          <Link href="/panel" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-tp-grad flex items-center justify-center font-display font-bold text-tp-bg">
              T
            </div>
            <div className="hidden sm:block">
              <p className="font-display font-bold text-sm tracking-wider leading-none">
                TECNOPRO
              </p>
              <p className="font-mono text-[9.5px] text-tp-muted tracking-[0.14em] mt-1">
                PANEL OPERATIVO
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-tight">
                {profile?.nombre ?? user.email}
              </p>
              <p className="font-mono text-[10px] text-tp-muted uppercase tracking-wider">
                {profile?.rol ?? "sin rol"}
              </p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      {children}
    </div>
  )
}
