import type { LucideIcon } from "lucide-react"
import { Construction } from "lucide-react"

type Props = {
  title: string
  description?: string
  phase?: string
  icon?: LucideIcon
}

export function ComingSoon({ title, description, phase, icon: Icon = Construction }: Props) {
  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <header>
          <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase">
            Módulo
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold mt-2">{title}</h1>
          {description && (
            <p className="text-tp-secondary mt-2 max-w-2xl">{description}</p>
          )}
        </header>

        <div className="rounded-xl border border-tp-line-soft bg-tp-card p-8 md:p-10 flex items-start gap-5">
          <div className="w-11 h-11 rounded-lg bg-tp-surface-mid border border-tp-line flex items-center justify-center text-tp-cyan shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <p className="font-mono text-[11px] text-tp-cyan tracking-[0.14em] uppercase">
              En construcción
            </p>
            <h2 className="font-display text-lg font-semibold">
              Este módulo se activa en {phase ?? "una próxima fase"}.
            </h2>
            <p className="text-sm text-tp-secondary max-w-lg">
              Ya está reservado en el sidebar y en la estructura de rutas. La lógica y las
              vistas se implementan cuando arranca su fase.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
