import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

// GET /api/search?q=texto
// Busca en órdenes, presupuestos y clientes. Retorna hasta 5 por tipo.
// Los técnicos ven solo lo que RLS les permite (sus órdenes, clientes, etc.).
export async function GET(req: Request) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 })
  }

  const url = new URL(req.url)
  const q = (url.searchParams.get("q") ?? "").trim()
  if (q.length < 2) {
    return NextResponse.json({ ok: true, data: { ordenes: [], presupuestos: [], clientes: [] } })
  }

  const like = `%${q}%`

  const [ordenesRes, presupuestosRes, clientesRes] = await Promise.all([
    supabase
      .from("ordenes")
      .select(`
        id, id_publico, estado, equipo_desc,
        clientes:cliente_id ( nombre, apellido, razon_social, tipo )
      `)
      .or(`id_publico.ilike.${like},equipo_desc.ilike.${like},falla_declarada.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("presupuestos")
      .select(`
        id, id_publico, titulo, estado,
        clientes:cliente_id ( nombre, apellido, razon_social, tipo )
      `)
      .or(`id_publico.ilike.${like},titulo.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("clientes")
      .select("id, id_publico, tipo, nombre, apellido, razon_social, telefono")
      .or(
        [
          `id_publico.ilike.${like}`,
          `nombre.ilike.${like}`,
          `apellido.ilike.${like}`,
          `razon_social.ilike.${like}`,
          `telefono.ilike.${like}`,
          `documento.ilike.${like}`,
        ].join(","),
      )
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  return NextResponse.json({
    ok: true,
    data: {
      ordenes: ordenesRes.data ?? [],
      presupuestos: presupuestosRes.data ?? [],
      clientes: clientesRes.data ?? [],
    },
  })
}
