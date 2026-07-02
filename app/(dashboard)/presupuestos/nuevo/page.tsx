import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { PresupuestoForm } from "@/components/presupuestos/PresupuestoForm"

function labelCliente(c: {
  nombre: string
  apellido: string | null
  razon_social: string | null
  tipo: string
}): string {
  if (c.tipo === "EMPRESA") return c.razon_social ?? c.nombre
  return [c.nombre, c.apellido].filter(Boolean).join(" ")
}

async function getConfigNumero(clave: string, fallback: number): Promise<number> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from("configuracion")
    .select("valor")
    .eq("clave", clave)
    .maybeSingle()
  const v = data?.valor
  if (v === null || v === undefined || v === "") return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export default async function NuevoPresupuestoPage() {
  const supabase = await createServerClient()

  const [clientesRes, ordenesRes, margen, validez] = await Promise.all([
    supabase
      .from("clientes")
      .select("id, id_publico, nombre, apellido, razon_social, tipo")
      .eq("estado", "ACTIVO")
      .order("nombre", { ascending: true })
      .limit(500),
    supabase
      .from("ordenes")
      .select("id, id_publico, equipo_desc, estado")
      .not("estado", "in", "(ENTREGADA,CANCELADA)")
      .order("fecha_recepcion", { ascending: false })
      .limit(200),
    getConfigNumero("margen_default_pct", 30),
    getConfigNumero("presupuesto_validez_dias", 7),
  ])

  const clientes = (clientesRes.data ?? []).map((c) => ({
    id: c.id,
    id_publico: c.id_publico,
    label: labelCliente(c),
  }))
  const ordenes = (ordenesRes.data ?? []).map((o) => ({
    id: o.id,
    id_publico: o.id_publico,
    label: o.equipo_desc ?? o.estado,
  }))

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link
            href="/presupuestos"
            className="inline-flex items-center gap-2 text-sm text-tp-muted hover:text-tp-text w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a presupuestos
          </Link>
          <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase mt-3">
            Nuevo presupuesto
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            Cotización
          </h1>
          <p className="text-tp-secondary">
            El ID PRES-XXXX se asigna al guardar. Los items se agregan desde la ficha.
          </p>
        </div>

        {clientes.length === 0 ? (
          <div className="rounded-xl border border-tp-amber/40 bg-tp-amber/10 p-5">
            <p className="font-display font-semibold text-tp-text">Sin clientes activos</p>
            <p className="text-sm text-tp-secondary mt-1">
              Necesitás al menos un cliente activo para armar un presupuesto.
            </p>
          </div>
        ) : (
          <PresupuestoForm
            mode="create"
            clientes={clientes}
            ordenes={ordenes}
            margenDefault={margen}
            validezDefaultDias={validez}
          />
        )}
      </div>
    </div>
  )
}
