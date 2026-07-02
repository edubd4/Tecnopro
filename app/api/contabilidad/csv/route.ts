import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { rangoMesActual, rangoAnioActual, toCSV, toISODate } from "@/lib/fechas"
import {
  TIPO_MOV_CAJA_LABEL,
  ORIGEN_MOV_CAJA_LABEL,
  METODO_PAGO_LABEL,
} from "@/lib/caja-ui"

type Row = {
  id_publico: string
  tipo: string
  origen: string
  monto: number
  metodo_pago: string
  descripcion: string
  fecha: string
  ordenes: { id_publico: string } | null
  gastos: { id_publico: string; categoria: { nombre: string } | null }[] | null
}

export async function GET(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, activo")
    .eq("id", user.id)
    .single()
  if (!profile?.activo || profile.rol !== "admin") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 })
  }

  // Resolver período desde querystring
  const preset = request.nextUrl.searchParams.get("preset") ?? "mes"
  let desde: string
  let hasta: string
  if (preset === "anio") {
    const r = rangoAnioActual()
    desde = r.desde
    hasta = r.hasta
  } else if (preset === "custom") {
    desde = request.nextUrl.searchParams.get("desde") ?? ""
    hasta = request.nextUrl.searchParams.get("hasta") ?? ""
    if (!desde || !hasta) {
      return NextResponse.json({ error: "Parámetros desde/hasta requeridos" }, { status: 400 })
    }
  } else {
    const r = rangoMesActual()
    desde = r.desde
    hasta = r.hasta
  }

  const { data, error } = await supabase
    .from("movimientos_caja")
    .select(`
      id_publico, tipo, origen, monto, metodo_pago, descripcion, fecha,
      ordenes:orden_id ( id_publico ),
      gastos ( id_publico, categoria:categoria_id ( nombre ) )
    `)
    .gte("fecha", desde)
    .lt("fecha", hasta)
    .order("fecha", { ascending: true })
    .limit(10000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (data ?? []) as unknown as Row[]

  const headers = [
    "ID",
    "Fecha",
    "Tipo",
    "Origen",
    "Categoría",
    "Método de pago",
    "Descripción",
    "Orden vinculada",
    "Gasto vinculado",
    "Monto (ARS)",
    "Signo",
  ]

  const csvRows = rows.map((m) => {
    const gasto = Array.isArray(m.gastos) ? m.gastos[0] : null
    const categoriaJoin = gasto?.categoria as unknown as { nombre: string } | null
    const categoria = categoriaJoin?.nombre ?? ""
    return [
      m.id_publico,
      m.fecha ? toISODate(new Date(m.fecha)) : "",
      TIPO_MOV_CAJA_LABEL[m.tipo] ?? m.tipo,
      ORIGEN_MOV_CAJA_LABEL[m.origen] ?? m.origen,
      categoria,
      METODO_PAGO_LABEL[m.metodo_pago] ?? m.metodo_pago,
      m.descripcion,
      m.ordenes?.id_publico ?? "",
      gasto?.id_publico ?? "",
      Number(m.monto).toFixed(2),
      m.tipo === "INGRESO" ? "+" : "-",
    ]
  })

  const csv = toCSV(headers, csvRows)

  const filename = `tecnopro-libro-${desde}_${hasta}.csv`
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
