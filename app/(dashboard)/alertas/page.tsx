import Link from "next/link"
import { Clock, Package, DollarSign, FileText, CheckCircle2 } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { formatFecha, formatPesos } from "@/lib/utils"
import { toISODate, ahoraArgentina } from "@/lib/fechas"
import { ESTADO_ORDEN_LABEL, ESTADO_ORDEN_VARIANT } from "@/lib/ordenes-ui"
import { ESTADO_PRES_LABEL, ESTADO_PRES_VARIANT } from "@/lib/presupuestos-ui"
import { CONFIG_KEYS, configNumber } from "@/lib/validators/configuracion"

// ============================================================================
// Alertas — admin-only. 4 secciones que exponen problemas que necesitan
// atención inmediata. Cada card linkea a la entidad correspondiente.
// Umbrales configurables desde /configuracion (Wave 2.4).
// ============================================================================

type EntregaVencidaRow = {
  id: string
  id_publico: string
  estado: string
  fecha_entrega_estimada: string
  clientes: { nombre: string; apellido: string | null; razon_social: string | null; tipo: string } | null
}

type SaldoVencidoRow = {
  id: string
  id_publico: string
  estado: string
  fecha_recepcion: string
  saldo_pendiente: number
  clientes: { nombre: string; apellido: string | null; razon_social: string | null; tipo: string } | null
}

type StockBajoRow = {
  id: string
  id_publico: string
  nombre: string
  stock_actual: number
  stock_minimo: number
}

type PresupuestoRow = {
  id: string
  id_publico: string
  titulo: string
  estado: string
  validez_hasta: string
  clientes: { nombre: string; apellido: string | null; razon_social: string | null; tipo: string } | null
}

function nombreCliente(c: {
  nombre: string; apellido: string | null; razon_social: string | null; tipo: string
} | null): string {
  if (!c) return "—"
  if (c.tipo === "EMPRESA") return c.razon_social ?? c.nombre
  return [c.nombre, c.apellido].filter(Boolean).join(" ")
}

export default async function AlertasPage() {
  const supabase = await createServerClient()

  // Traemos los umbrales configurables. Fallback: 30 días saldo, 7 días presupuesto.
  const { data: configRows } = await supabase
    .from("configuracion")
    .select("clave, valor")
    .in("clave", [
      CONFIG_KEYS.ALERTA_SALDO_VENCIDO_DIAS,
      CONFIG_KEYS.ALERTA_PRESUPUESTO_POR_VENCER,
    ])
  const configValues = Object.fromEntries(
    (configRows ?? []).map((r) => [r.clave, (r.valor as string | null) ?? ""]),
  ) as Record<string, string>
  const DIAS_SALDO_VENCIDO = configNumber(configValues, CONFIG_KEYS.ALERTA_SALDO_VENCIDO_DIAS, 30)
  const DIAS_PRESUPUESTO_PROXIMO = configNumber(configValues, CONFIG_KEYS.ALERTA_PRESUPUESTO_POR_VENCER, 7)

  // "Hoy" en hora argentina — el server corre en UTC.
  const ahora = ahoraArgentina()
  const hoyISO = toISODate(ahora)
  const proximosDiasISO = toISODate(
    new Date(ahora.getTime() + DIAS_PRESUPUESTO_PROXIMO * 24 * 3600_000),
  )
  const hace30DiasISO = toISODate(
    new Date(ahora.getTime() - DIAS_SALDO_VENCIDO * 24 * 3600_000),
  )

  const [entregasRes, saldosRes, repuestosRes, presupuestosRes, presupuestosVencidosRes] = await Promise.all([
    supabase
      .from("ordenes")
      .select(`
        id, id_publico, estado, fecha_entrega_estimada,
        clientes:cliente_id ( nombre, apellido, razon_social, tipo )
      `)
      .lt("fecha_entrega_estimada", hoyISO)
      .not("estado", "in", "(ENTREGADA,CANCELADA)")
      .order("fecha_entrega_estimada", { ascending: true })
      .limit(50),
    supabase
      .from("ordenes_con_saldo")
      .select(`
        id, id_publico, estado, fecha_recepcion, saldo_pendiente,
        clientes:cliente_id ( nombre, apellido, razon_social, tipo )
      `)
      .gt("saldo_pendiente", 0)
      .neq("estado", "CANCELADA")
      .lte("fecha_recepcion", hace30DiasISO)
      .order("fecha_recepcion", { ascending: true })
      .limit(50),
    // Stock bajo: traemos activos con stock_minimo>0 y filtramos en JS
    // (supabase-js no compara dos columnas de la misma tabla directamente).
    supabase
      .from("repuestos")
      .select("id, id_publico, nombre, stock_actual, stock_minimo")
      .eq("activo", true)
      .gt("stock_minimo", 0)
      .order("nombre", { ascending: true }),
    supabase
      .from("presupuestos")
      .select(`
        id, id_publico, titulo, estado, validez_hasta,
        clientes:cliente_id ( nombre, apellido, razon_social, tipo )
      `)
      .eq("estado", "ENVIADO")
      .gte("validez_hasta", hoyISO)
      .lte("validez_hasta", proximosDiasISO)
      .order("validez_hasta", { ascending: true })
      .limit(50),
    // ENVIADOS cuya validez ya pasó: quedaron colgados sin respuesta del
    // cliente. Hay que marcarlos VENCIDO (o renegociar) desde la ficha.
    supabase
      .from("presupuestos")
      .select(`
        id, id_publico, titulo, estado, validez_hasta,
        clientes:cliente_id ( nombre, apellido, razon_social, tipo )
      `)
      .eq("estado", "ENVIADO")
      .lt("validez_hasta", hoyISO)
      .order("validez_hasta", { ascending: true })
      .limit(50),
  ])

  const entregas = (entregasRes.data ?? []) as unknown as EntregaVencidaRow[]
  const saldos = (saldosRes.data ?? []) as unknown as SaldoVencidoRow[]
  const stockRaw = (repuestosRes.data ?? []) as StockBajoRow[]
  const stock = stockRaw.filter((r) => Number(r.stock_actual) <= Number(r.stock_minimo))
  const presupuestos = (presupuestosRes.data ?? []) as unknown as PresupuestoRow[]
  const presupuestosVencidos = (presupuestosVencidosRes.data ?? []) as unknown as PresupuestoRow[]

  const total = entregas.length + saldos.length + stock.length + presupuestos.length + presupuestosVencidos.length

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase">
            Módulo · Alertas
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">
            Cosas que atender
          </h1>
          <p className="text-tp-secondary mt-1">
            Entregas vencidas, saldos con demora, stock bajo y presupuestos por vencer.
          </p>
        </header>

        {total === 0 ? (
          <section className="rounded-xl border border-tp-green/40 bg-tp-green/10 p-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-tp-green mx-auto" />
            <p className="font-display text-xl font-semibold text-tp-green">Todo en orden</p>
            <p className="text-sm text-tp-secondary">
              No hay alertas activas ahora mismo. Buen trabajo.
            </p>
          </section>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <ContadorCard
                icon={<Clock className="w-4 h-4" />}
                label="Entregas vencidas"
                count={entregas.length}
                tone="red"
              />
              <ContadorCard
                icon={<DollarSign className="w-4 h-4" />}
                label={`Saldos > ${DIAS_SALDO_VENCIDO}d`}
                count={saldos.length}
                tone="amber"
              />
              <ContadorCard
                icon={<Package className="w-4 h-4" />}
                label="Stock bajo"
                count={stock.length}
                tone="violet"
              />
              <ContadorCard
                icon={<FileText className="w-4 h-4" />}
                label="Presupuestos por vencer"
                count={presupuestos.length}
                tone="cyan"
              />
              <ContadorCard
                icon={<FileText className="w-4 h-4" />}
                label="Presupuestos vencidos"
                count={presupuestosVencidos.length}
                tone="red"
              />
            </div>

            {/* Entregas vencidas */}
            {entregas.length > 0 && (
              <Seccion titulo="Entregas vencidas" icon={<Clock className="w-4 h-4" />} tone="red">
                <ul className="divide-y divide-tp-line-soft">
                  {entregas.map((o) => (
                    <li key={o.id}>
                      <Link
                        href={`/ordenes/${o.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-tp-surface-mid/50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-tp-cyan text-xs shrink-0">{o.id_publico}</span>
                          <span className="text-sm text-tp-text truncate">{nombreCliente(o.clientes)}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={ESTADO_ORDEN_VARIANT[o.estado] ?? "gray"}>
                            {ESTADO_ORDEN_LABEL[o.estado] ?? o.estado}
                          </Badge>
                          <span className="font-mono text-xs text-tp-red">
                            {formatFecha(o.fecha_entrega_estimada)}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Seccion>
            )}

            {/* Saldos vencidos */}
            {saldos.length > 0 && (
              <Seccion
                titulo={`Órdenes con saldo pendiente hace más de ${DIAS_SALDO_VENCIDO} días`}
                icon={<DollarSign className="w-4 h-4" />}
                tone="amber"
              >
                <ul className="divide-y divide-tp-line-soft">
                  {saldos.map((o) => (
                    <li key={o.id}>
                      <Link
                        href={`/ordenes/${o.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-tp-surface-mid/50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-tp-cyan text-xs shrink-0">{o.id_publico}</span>
                          <span className="text-sm text-tp-text truncate">{nombreCliente(o.clientes)}</span>
                          <span className="font-mono text-[10.5px] text-tp-muted shrink-0">
                            recibida {formatFecha(o.fecha_recepcion)}
                          </span>
                        </div>
                        <span className="font-mono text-sm text-tp-amber font-semibold shrink-0">
                          {formatPesos(Number(o.saldo_pendiente))}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Seccion>
            )}

            {/* Stock bajo */}
            {stock.length > 0 && (
              <Seccion titulo="Repuestos con stock bajo" icon={<Package className="w-4 h-4" />} tone="violet">
                <ul className="divide-y divide-tp-line-soft">
                  {stock.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/stock/${r.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-tp-surface-mid/50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-tp-cyan text-xs shrink-0">{r.id_publico}</span>
                          <span className="text-sm text-tp-text truncate">{r.nombre}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                          <span className="text-tp-red">{r.stock_actual}</span>
                          <span className="text-tp-muted">/ mínimo {r.stock_minimo}</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Seccion>
            )}

            {/* Presupuestos por vencer */}
            {presupuestos.length > 0 && (
              <Seccion
                titulo={`Presupuestos ENVIADOS que vencen en los próximos ${DIAS_PRESUPUESTO_PROXIMO} días`}
                icon={<FileText className="w-4 h-4" />}
                tone="cyan"
              >
                <ul className="divide-y divide-tp-line-soft">
                  {presupuestos.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/presupuestos/${p.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-tp-surface-mid/50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-tp-cyan text-xs shrink-0">{p.id_publico}</span>
                          <span className="text-sm text-tp-text truncate">{p.titulo}</span>
                          <span className="text-xs text-tp-secondary truncate">
                            · {nombreCliente(p.clientes)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={ESTADO_PRES_VARIANT[p.estado] ?? "gray"}>
                            {ESTADO_PRES_LABEL[p.estado] ?? p.estado}
                          </Badge>
                          <span className="font-mono text-xs text-tp-cyan">
                            vence {formatFecha(p.validez_hasta)}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Seccion>
            )}

            {/* Presupuestos ya vencidos sin resolver */}
            {presupuestosVencidos.length > 0 && (
              <Seccion
                titulo="Presupuestos ENVIADOS con validez vencida — marcalos VENCIDO o renegociá"
                icon={<FileText className="w-4 h-4" />}
                tone="red"
              >
                <ul className="divide-y divide-tp-line-soft">
                  {presupuestosVencidos.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/presupuestos/${p.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-tp-surface-mid/50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-tp-cyan text-xs shrink-0">{p.id_publico}</span>
                          <span className="text-sm text-tp-text truncate">{p.titulo}</span>
                          <span className="text-xs text-tp-secondary truncate">
                            · {nombreCliente(p.clientes)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={ESTADO_PRES_VARIANT[p.estado] ?? "gray"}>
                            {ESTADO_PRES_LABEL[p.estado] ?? p.estado}
                          </Badge>
                          <span className="font-mono text-xs text-tp-red">
                            venció {formatFecha(p.validez_hasta)}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Seccion>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ContadorCard({
  icon,
  label,
  count,
  tone,
}: {
  icon: React.ReactNode
  label: string
  count: number
  tone: "red" | "amber" | "violet" | "cyan"
}) {
  const toneClasses = {
    red: "text-tp-red",
    amber: "text-tp-amber",
    violet: "text-tp-violet",
    cyan: "text-tp-cyan",
  }[tone]

  return (
    <div className="rounded-xl border border-tp-line-soft bg-tp-card p-5">
      <div className={`flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-widest ${toneClasses}`}>
        {icon}
        {label}
      </div>
      <p className="font-display text-2xl mt-2 text-tp-text">{count}</p>
    </div>
  )
}

function Seccion({
  titulo,
  icon,
  tone,
  children,
}: {
  titulo: string
  icon: React.ReactNode
  tone: "red" | "amber" | "violet" | "cyan"
  children: React.ReactNode
}) {
  const border = {
    red: "border-tp-red/40",
    amber: "border-tp-amber/40",
    violet: "border-tp-violet/40",
    cyan: "border-tp-cyan/40",
  }[tone]
  const iconColor = {
    red: "text-tp-red",
    amber: "text-tp-amber",
    violet: "text-tp-violet",
    cyan: "text-tp-cyan",
  }[tone]

  return (
    <section className={`rounded-xl border ${border} bg-tp-card overflow-hidden`}>
      <div className={`flex items-center gap-2 px-4 py-3 border-b border-tp-line-soft ${iconColor}`}>
        {icon}
        <h2 className="font-display font-semibold">{titulo}</h2>
      </div>
      {children}
    </section>
  )
}
