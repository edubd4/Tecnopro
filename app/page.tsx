import Link from "next/link"
import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"

export default async function Home() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Si ya está autenticado, mandamos derecho al panel
  if (user) {
    redirect("/panel")
  }

  return (
    <main className="tp-circuit min-h-screen flex items-center justify-center px-6">
      <div className="max-w-xl text-center space-y-8">
        <div className="inline-flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-tp-grad flex items-center justify-center font-display font-bold text-tp-bg text-xl">
            T
          </div>
          <div className="text-left">
            <p className="font-display font-bold text-xl tracking-wider">TECNOPRO</p>
            <p className="font-mono text-[10.5px] text-tp-muted tracking-[0.16em]">
              GESTIÓN INTEGRAL · SERVICIO TÉCNICO
            </p>
          </div>
        </div>

        <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight">
          Toda tu operación,{" "}
          <span className="bg-tp-grad bg-clip-text text-transparent">
            en un solo lugar.
          </span>
        </h1>

        <p className="text-tp-secondary">
          Iniciá sesión para acceder al panel.
        </p>

        <Link
          href="/login"
          className="inline-block px-6 py-3 rounded-lg bg-tp-grad text-tp-bg font-display font-semibold hover:opacity-90 transition"
        >
          Iniciar sesión
        </Link>
      </div>
    </main>
  )
}
