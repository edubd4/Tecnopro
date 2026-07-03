import Link from "next/link"
import { redirect } from "next/navigation"
import { Tag, ChevronRight } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { ConfiguracionForm } from "@/components/configuracion/ConfiguracionForm"
import { CONFIG_FIELDS } from "@/lib/validators/configuracion"
import { ROL } from "@/lib/constants"

export default async function ConfiguracionPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, activo")
    .eq("id", user!.id)
    .single()

  if (profile?.rol !== ROL.ADMIN || !profile.activo) {
    redirect("/panel")
  }

  // Traigo todos los valores conocidos. Si alguna clave no existe (por si
  // se agregara despues), la muestro vacia.
  const { data: rows } = await supabase
    .from("configuracion")
    .select("clave, valor")
    .in("clave", CONFIG_FIELDS.map((f) => f.clave))

  const values = Object.fromEntries(
    (rows ?? []).map((r) => [r.clave, (r.valor as string | null) ?? ""])
  ) as Record<string, string>

  // Rellenar con "" las claves faltantes para que el form no tire warnings
  for (const f of CONFIG_FIELDS) {
    if (!(f.clave in values)) values[f.clave] = ""
  }

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header>
          <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase">
            Módulo · Configuración
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">
            Datos del negocio y parámetros
          </h1>
          <p className="text-tp-secondary mt-1 max-w-2xl">
            Estos valores se usan en toda la app: nombre en encabezados y emails, moneda por
            defecto, márgenes sugeridos, validez de presupuestos y ventanas de alertas.
          </p>
        </header>

        <ConfiguracionForm values={values} />

        <section className="pt-6 border-t border-tp-line-soft space-y-3">
          <h2 className="font-display text-xl font-semibold">Otras configuraciones</h2>
          <Link
            href="/configuracion/categorias-gasto"
            className="flex items-center gap-3 rounded-xl border border-tp-line-soft bg-tp-card p-4 hover:border-tp-cyan/40 transition-colors group"
          >
            <div className="rounded-lg bg-tp-cyan/10 text-tp-cyan p-2 shrink-0">
              <Tag className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-semibold text-tp-text group-hover:text-tp-cyan transition-colors">
                Categorías de gasto
              </p>
              <p className="text-xs text-tp-secondary mt-0.5">
                Crear, renombrar, activar o desactivar las categorías que aparecen al registrar un gasto.
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-tp-muted group-hover:text-tp-cyan" />
          </Link>
        </section>
      </div>
    </div>
  )
}
