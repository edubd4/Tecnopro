export default function DashboardPage() {
  return (
    <main className="tp-circuit min-h-screen px-8 py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase">
            Panel principal
          </p>
          <h1 className="font-display text-3xl font-bold mt-2">
            Bienvenido a TECNOPRO
          </h1>
          <p className="text-tp-secondary mt-2 max-w-2xl">
            Acá vas a ver el resumen del día: órdenes activas, turnos, caja y alertas.
            Estamos en Fase 1 — módulos se van habilitando por olas.
          </p>
        </div>

        {/* TODO Fase 2.D: KPIs, alertas, vista de turnos del día */}
        <div className="rounded-xl border border-tp-line-soft bg-tp-card p-6 font-mono text-sm text-tp-muted">
          [ Panel placeholder — módulos del dashboard en Fase 2 ola D ]
        </div>
      </div>
    </main>
  )
}
