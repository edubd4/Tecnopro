import type { SupabaseClient } from "@supabase/supabase-js"
import { rangoMesActual, nombreMes } from "@/lib/fechas"

// ============================================================================
// Arma un "snapshot del negocio" que se inyecta en el system prompt del chat.
// La idea: el modelo no tiene tools todavía; le damos contexto pre-calculado
// con las métricas más importantes para que pueda responder preguntas típicas
// del dueño ("¿cuánto facturé este mes?", "¿qué órdenes están vencidas?", etc).
//
// Para consultas más específicas (por cliente/orden/técnico), el modelo debe
// decir "no tengo ese dato, mirá en el módulo X".
// ============================================================================

const money = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n)

const fecha = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso.length === 10 ? `${iso}T12:00:00` : iso))

export async function armarContextoDeNegocio(
  supabase: SupabaseClient,
): Promise<string> {
  const { desde, hasta } = rangoMesActual()
  const hoy = new Date()
  const hoyISO = hoy.toISOString().substring(0, 10)

  const [
    configRes,
    saldoRes,
    ordenesTodasRes,
    ordenesConSaldoRes,
    ordenesRecientesRes,
    turnosHoyRes,
    movimientosMesRes,
    gastosCategoriaRes,
    presupuestosPendientesRes,
    stockBajoRes,
    entregasVencidasRes,
  ] = await Promise.all([
    supabase.from("configuracion").select("clave, valor"),
    supabase.from("saldo_caja").select("*").maybeSingle(),
    supabase.from("ordenes").select("estado"),
    supabase
      .from("ordenes_con_saldo")
      .select("id_publico, saldo_pendiente, estado, fecha_recepcion")
      .gt("saldo_pendiente", 0)
      .neq("estado", "CANCELADA")
      .order("saldo_pendiente", { ascending: false })
      .limit(10),
    supabase
      .from("ordenes")
      .select(`
        id_publico, estado, fecha_recepcion, equipo_desc,
        clientes:cliente_id ( nombre, apellido, razon_social, tipo )
      `)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("turnos")
      .select("id_publico, titulo, fecha_inicio, estado")
      .gte("fecha_inicio", `${hoyISO}T00:00:00`)
      .lt("fecha_inicio", `${hoyISO}T23:59:59`)
      .order("fecha_inicio", { ascending: true }),
    supabase
      .from("movimientos_caja")
      .select("tipo, monto")
      .gte("fecha", desde)
      .lt("fecha", hasta),
    supabase
      .from("gastos")
      .select(`monto, categoria:categoria_id ( nombre )`)
      .gte("fecha", desde)
      .lt("fecha", hasta),
    supabase
      .from("presupuestos")
      .select("id_publico, estado, validez_hasta, titulo")
      .in("estado", ["ENVIADO", "BORRADOR"])
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("repuestos")
      .select("id_publico, nombre, stock_actual, stock_minimo")
      .eq("activo", true)
      .gt("stock_minimo", 0),
    supabase
      .from("ordenes")
      .select(`
        id_publico, fecha_entrega_estimada, estado,
        clientes:cliente_id ( nombre, apellido, razon_social, tipo )
      `)
      .lt("fecha_entrega_estimada", hoyISO)
      .not("estado", "in", "(ENTREGADA,CANCELADA)")
      .order("fecha_entrega_estimada", { ascending: true })
      .limit(10),
  ])

  // ─── Config ──
  const config = new Map<string, string>()
  for (const row of (configRes.data ?? []) as { clave: string; valor: string | null }[]) {
    if (row.valor) config.set(row.clave, row.valor)
  }
  const negocio = config.get("negocio_nombre") ?? "TECNOPRO"

  // ─── Caja ──
  const saldo = (saldoRes.data ?? { saldo: 0, total_ingresos: 0, total_egresos: 0, movimientos_total: 0 }) as {
    saldo: number
    total_ingresos: number
    total_egresos: number
    movimientos_total: number
  }

  // ─── Órdenes por estado ──
  const porEstado: Record<string, number> = {}
  for (const o of (ordenesTodasRes.data ?? []) as { estado: string }[]) {
    porEstado[o.estado] = (porEstado[o.estado] ?? 0) + 1
  }
  const ordenesActivas =
    (porEstado.RECIBIDA ?? 0) +
    (porEstado.DIAGNOSTICO ?? 0) +
    (porEstado.PRESUPUESTADA ?? 0) +
    (porEstado.EN_REPARACION ?? 0) +
    (porEstado.LISTA ?? 0)

  // ─── Saldos pendientes ──
  const ordenesConSaldo = (ordenesConSaldoRes.data ?? []) as {
    id_publico: string
    saldo_pendiente: number
    estado: string
    fecha_recepcion: string
  }[]
  const totalPorCobrar = ordenesConSaldo.reduce((s, o) => s + Number(o.saldo_pendiente), 0)

  // ─── Movimientos del mes ──
  const movs = (movimientosMesRes.data ?? []) as { tipo: string; monto: number }[]
  const ingresosMes = movs.filter((m) => m.tipo === "INGRESO").reduce((s, m) => s + Number(m.monto), 0)
  const egresosMes = movs.filter((m) => m.tipo === "EGRESO").reduce((s, m) => s + Number(m.monto), 0)
  const netoMes = ingresosMes - egresosMes

  // ─── Gastos por categoría del mes ──
  const porCategoria: Record<string, number> = {}
  for (const g of (gastosCategoriaRes.data ?? []) as unknown as {
    monto: number
    categoria: { nombre: string } | null
  }[]) {
    const nombre = g.categoria?.nombre ?? "Sin categoría"
    porCategoria[nombre] = (porCategoria[nombre] ?? 0) + Number(g.monto)
  }
  const topCategorias = Object.entries(porCategoria)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  // ─── Stock bajo (filtrado en JS) ──
  const stockBajo = ((stockBajoRes.data ?? []) as {
    id_publico: string
    nombre: string
    stock_actual: number
    stock_minimo: number
  }[]).filter((r) => Number(r.stock_actual) <= Number(r.stock_minimo))

  // ─── Formateo del contexto ──
  const lineas: string[] = []
  lineas.push(`=== SNAPSHOT DEL NEGOCIO (${negocio}) ===`)
  lineas.push(`Fecha actual: ${fecha(hoyISO)}. Mes en curso: ${nombreMes()}.`)
  lineas.push("")

  lineas.push("--- CAJA ---")
  lineas.push(`Saldo actual: ${money(Number(saldo.saldo))}`)
  lineas.push(`Ingresos totales histórico: ${money(Number(saldo.total_ingresos))}`)
  lineas.push(`Egresos totales histórico: ${money(Number(saldo.total_egresos))}`)
  lineas.push(`Movimientos totales: ${saldo.movimientos_total}`)
  lineas.push("")

  lineas.push(`--- FLUJO DEL MES (${nombreMes()}) ---`)
  lineas.push(`Ingresos del mes: ${money(ingresosMes)}`)
  lineas.push(`Egresos del mes: ${money(egresosMes)}`)
  lineas.push(`Resultado neto del mes: ${money(netoMes)}`)
  lineas.push("")

  if (topCategorias.length > 0) {
    lineas.push("--- TOP CATEGORÍAS DE GASTO DEL MES ---")
    for (const [nombre, monto] of topCategorias) {
      lineas.push(`- ${nombre}: ${money(monto)}`)
    }
    lineas.push("")
  }

  lineas.push("--- ÓRDENES ---")
  lineas.push(`Total activas (no entregadas ni canceladas): ${ordenesActivas}`)
  for (const [estado, count] of Object.entries(porEstado)) {
    lineas.push(`- ${estado}: ${count}`)
  }
  lineas.push("")

  const entregasVencidas = (entregasVencidasRes.data ?? []) as unknown as {
    id_publico: string
    fecha_entrega_estimada: string
    estado: string
    clientes: { nombre: string; apellido: string | null; razon_social: string | null; tipo: string } | null
  }[]
  if (entregasVencidas.length > 0) {
    lineas.push(`--- ENTREGAS VENCIDAS (${entregasVencidas.length}) ---`)
    for (const o of entregasVencidas.slice(0, 5)) {
      const cli = o.clientes
      const nombreCli = cli
        ? cli.tipo === "EMPRESA"
          ? cli.razon_social ?? cli.nombre
          : [cli.nombre, cli.apellido].filter(Boolean).join(" ")
        : "cliente"
      lineas.push(`- ${o.id_publico} · ${nombreCli} · entrega ${fecha(o.fecha_entrega_estimada)} · estado ${o.estado}`)
    }
    lineas.push("")
  }

  lineas.push(`--- POR COBRAR (${ordenesConSaldo.length} órdenes, total ${money(totalPorCobrar)}) ---`)
  for (const o of ordenesConSaldo.slice(0, 5)) {
    lineas.push(`- ${o.id_publico} · saldo ${money(Number(o.saldo_pendiente))} · estado ${o.estado} · recibida ${fecha(o.fecha_recepcion)}`)
  }
  lineas.push("")

  const turnosHoy = (turnosHoyRes.data ?? []) as {
    id_publico: string
    titulo: string
    fecha_inicio: string
    estado: string
  }[]
  lineas.push(`--- TURNOS DE HOY (${turnosHoy.length}) ---`)
  for (const t of turnosHoy.slice(0, 5)) {
    const hora = new Date(t.fecha_inicio).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    })
    lineas.push(`- ${hora} · ${t.id_publico} · ${t.titulo} · ${t.estado}`)
  }
  lineas.push("")

  const presupPend = (presupuestosPendientesRes.data ?? []) as {
    id_publico: string
    estado: string
    validez_hasta: string
    titulo: string
  }[]
  if (presupPend.length > 0) {
    lineas.push(`--- PRESUPUESTOS ACTIVOS (${presupPend.length}) ---`)
    for (const p of presupPend.slice(0, 5)) {
      lineas.push(`- ${p.id_publico} · ${p.titulo} · ${p.estado} · vence ${fecha(p.validez_hasta)}`)
    }
    lineas.push("")
  }

  if (stockBajo.length > 0) {
    lineas.push(`--- STOCK BAJO (${stockBajo.length}) ---`)
    for (const r of stockBajo.slice(0, 5)) {
      lineas.push(`- ${r.id_publico} · ${r.nombre} · actual ${r.stock_actual} / mínimo ${r.stock_minimo}`)
    }
    lineas.push("")
  }

  const ordenesRecientes = (ordenesRecientesRes.data ?? []) as unknown as {
    id_publico: string
    estado: string
    fecha_recepcion: string
    equipo_desc: string | null
    clientes: { nombre: string; apellido: string | null; razon_social: string | null; tipo: string } | null
  }[]
  if (ordenesRecientes.length > 0) {
    lineas.push("--- ÚLTIMAS 5 ÓRDENES CREADAS ---")
    for (const o of ordenesRecientes) {
      const cli = o.clientes
      const nombreCli = cli
        ? cli.tipo === "EMPRESA"
          ? cli.razon_social ?? cli.nombre
          : [cli.nombre, cli.apellido].filter(Boolean).join(" ")
        : "cliente"
      lineas.push(`- ${o.id_publico} · ${nombreCli} · ${o.equipo_desc ?? "sin equipo"} · ${o.estado}`)
    }
    lineas.push("")
  }

  lineas.push("=== FIN DEL SNAPSHOT ===")
  return lineas.join("\n")
}
