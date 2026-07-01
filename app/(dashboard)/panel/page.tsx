import { createServerClient } from "@/lib/supabase/server"
import { ROL } from "@/lib/constants"

export default async function PanelPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // El layout ya bloquea sin user, pero por si acaso
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("nombre, rol, email")
    .eq("id", user.id)
    .single()

  const nombre = profile?.nombre ?? user.email
  const esAdmin = profile?.rol === ROL.ADMIN

  return (
    <div className="tp-circuit min-h-screen px-6 md:px-10 py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase">
            Panel principal
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold mt-2">
            Hola, {nombre}
          </h1>
          <p className="text-tp-secondary mt-2 max-w-2xl">
            {esAdmin
              ? "Este es el resumen de la operación. Órdenes, turnos, caja y alertas se van conectando por fase."
              : "Acá vas a ver tus órdenes asignadas, turnos del día y trabajos pendientes."}
          </p>
        </header>

        <section className="rounded-xl border border-tp-line-soft bg-tp-card p-6 space-y-3">
          <p className="font-mono text-xs text-tp-cyan tracking-[0.14em] uppercase">
            Estado del sistema
          </p>
          <h2 className="font-display text-lg font-semibold">Fase 1 · Bootstrap completado</h2>
          <ul className="text-sm text-tp-secondary space-y-1.5">
            <li>✓ Auth conectada a Supabase</li>
            <li>✓ RLS habilitada en todas las tablas</li>
            <li>✓ Tabla <code className="font-mono text-tp-cyan">profiles</code> con tu perfil creado automáticamente</li>
            <li className="text-tp-muted">→ Próxima fase: shell del dashboard (sidebar + módulos)</li>
          </ul>
        </section>

        <section className="rounded-xl border border-tp-line-soft bg-tp-card p-6 font-mono text-sm text-tp-muted">
          [ KPIs, alertas y widgets del panel — Fase 2 ola D ]
        </section>
      </div>
    </div>
  )
}
