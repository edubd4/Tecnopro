import Link from "next/link"
import { cn } from "@/lib/utils"
import { ESTADO_TURNO_VARIANT } from "@/lib/turnos-ui"

type TurnoBloque = {
  id: string
  id_publico: string
  titulo: string
  fecha_inicio: string
  fecha_fin: string
  estado: string
  tecnico_nombre: string | null
}

type Props = {
  turnos: TurnoBloque[]
  weekStartISO: string  // "YYYY-MM-DD" del lunes visible (server-calculated, TZ-safe)
  horaInicio?: number   // hora en la que arranca la vista (default 7)
  horaFin?: number      // hora en la que termina (default 21)
}

const DIAS_NOMBRE = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

export function SemanaCalendario({ turnos, weekStartISO, horaInicio = 7, horaFin = 21 }: Props) {
  // Reconstruimos las fechas a partir del ISO con T12:00:00 para evitar drift
  // de TZ al pasar server → client (si usaramos T00:00:00, el client en AR = UTC-3
  // podria retroceder al dia anterior).
  const dias: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(`${weekStartISO}T12:00:00`)
    d.setDate(d.getDate() + i)
    dias.push(d)
  }
  const totalHoras = horaFin - horaInicio    // ej 14
  const pxPorHora = 44                        // altura visual de una hora
  const alturaGrilla = totalHoras * pxPorHora

  return (
    <div className="rounded-xl border border-tp-line-soft bg-tp-card overflow-hidden">
      {/* Header de días */}
      <div className="grid" style={{ gridTemplateColumns: "60px repeat(7, minmax(0, 1fr))" }}>
        <div className="border-r border-tp-line-soft" />
        {dias.map((d) => {
          const esHoy = sameDay(d, new Date())
          return (
            <div
              key={d.toISOString()}
              className={cn(
                "px-2 py-3 text-center border-r border-tp-line-soft last:border-r-0",
                esHoy && "bg-tp-cyan/5"
              )}
            >
              <p className="font-mono text-[10px] text-tp-muted uppercase tracking-widest">
                {DIAS_NOMBRE[(d.getDay() + 6) % 7]}
              </p>
              <p className={cn(
                "font-display text-lg font-semibold mt-1",
                esHoy ? "text-tp-cyan" : "text-tp-text"
              )}>
                {d.getDate()}
              </p>
            </div>
          )
        })}
      </div>

      {/* Grilla con horas */}
      <div className="relative grid" style={{ gridTemplateColumns: "60px repeat(7, minmax(0, 1fr))" }}>
        {/* Columna de horas */}
        <div className="border-r border-tp-line-soft border-t border-tp-line-soft" style={{ height: alturaGrilla }}>
          {Array.from({ length: totalHoras }).map((_, i) => (
            <div
              key={i}
              className="text-right pr-2 pt-0 font-mono text-[10px] text-tp-muted"
              style={{ height: pxPorHora }}
            >
              {String(horaInicio + i).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* 7 columnas de días */}
        {dias.map((d, diaIdx) => {
          const turnosDelDia = turnos.filter((t) => {
            const inicio = new Date(t.fecha_inicio)
            return sameDay(inicio, d)
          })

          return (
            <div
              key={diaIdx}
              className="relative border-r border-tp-line-soft border-t border-tp-line-soft last:border-r-0"
              style={{ height: alturaGrilla }}
            >
              {/* Guías horarias */}
              {Array.from({ length: totalHoras }).map((_, i) => (
                <div
                  key={i}
                  className="border-b border-tp-line-soft/40"
                  style={{ height: pxPorHora }}
                />
              ))}

              {/* Turnos posicionados */}
              {turnosDelDia.map((t) => {
                const inicio = new Date(t.fecha_inicio)
                const fin = new Date(t.fecha_fin)
                const startHour = inicio.getHours() + inicio.getMinutes() / 60
                const endHour = fin.getHours() + fin.getMinutes() / 60
                // Clamp al rango visible
                const s = Math.max(startHour, horaInicio)
                const e = Math.min(endHour, horaFin)
                if (e <= s) return null

                const top = (s - horaInicio) * pxPorHora
                const height = Math.max((e - s) * pxPorHora, 20)

                const variant = ESTADO_TURNO_VARIANT[t.estado] ?? "gray"
                const colors = {
                  cyan:  "bg-tp-cyan/15 border-tp-cyan/50 text-tp-cyan",
                  amber: "bg-tp-amber/15 border-tp-amber/50 text-tp-amber",
                  green: "bg-tp-green/15 border-tp-green/50 text-tp-green",
                  red:   "bg-tp-red/15 border-tp-red/50 text-tp-red",
                  gray:  "bg-tp-surface-mid border-tp-line text-tp-muted",
                }[variant]

                return (
                  <Link
                    key={t.id}
                    href={`/turnos/${t.id}`}
                    className={cn(
                      "absolute left-1 right-1 rounded-md border-l-2 px-2 py-1 overflow-hidden",
                      "hover:brightness-125 transition",
                      colors
                    )}
                    style={{ top, height }}
                    title={`${t.id_publico} · ${t.titulo}`}
                  >
                    <p className="text-[10px] font-mono opacity-80">
                      {inicio.getHours().toString().padStart(2, "0")}:{inicio.getMinutes().toString().padStart(2, "0")}
                    </p>
                    <p className="text-xs font-medium truncate mt-0.5">{t.titulo}</p>
                    {t.tecnico_nombre && (
                      <p className="text-[10px] opacity-70 truncate">{t.tecnico_nombre}</p>
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
