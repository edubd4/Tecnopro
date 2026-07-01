import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Mail, MapPin, MessageCircle, Phone } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { ClienteForm } from "@/components/clientes/ClienteForm"
import { ToggleClienteEstadoButton } from "@/components/clientes/ToggleClienteEstadoButton"
import { ROL } from "@/lib/constants"
import { formatFechaHora } from "@/lib/utils"

type ClienteRow = {
  id: string
  id_publico: string
  tipo: "PARTICULAR" | "EMPRESA"
  nombre: string
  apellido: string | null
  razon_social: string | null
  documento: string | null
  telefono: string | null
  whatsapp: string | null
  email: string | null
  direccion: string | null
  provincia: string | null
  ciudad: string | null
  notas: string | null
  estado: "ACTIVO" | "INACTIVO"
  created_at: string
  updated_at: string
}

function nombreVisible(c: ClienteRow): string {
  if (c.tipo === "EMPRESA") return c.razon_social ?? c.nombre
  return [c.nombre, c.apellido].filter(Boolean).join(" ")
}

export default async function ClienteDetallePage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user!.id)
    .single()
  const esAdmin = profile?.rol === ROL.ADMIN

  const { data: cliente } = await supabase
    .from("clientes")
    .select(
      "id, id_publico, tipo, nombre, apellido, razon_social, documento, telefono, whatsapp, email, direccion, provincia, ciudad, notas, estado, created_at, updated_at"
    )
    .eq("id", params.id)
    .maybeSingle()

  if (!cliente) notFound()
  const c = cliente as ClienteRow

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          href="/clientes"
          className="inline-flex items-center gap-2 text-sm text-tp-muted hover:text-tp-text w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a la lista
        </Link>

        <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-[13px] text-tp-cyan font-semibold tracking-wider">
                {c.id_publico}
              </span>
              <Badge variant={c.tipo === "EMPRESA" ? "violet" : "cyan"}>
                {c.tipo === "EMPRESA" ? "Empresa" : "Particular"}
              </Badge>
              <Badge variant={c.estado === "ACTIVO" ? "green" : "gray"}>
                {c.estado}
              </Badge>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold">
              {nombreVisible(c)}
            </h1>
            {c.documento && (
              <p className="text-sm text-tp-muted font-mono">Doc: {c.documento}</p>
            )}
          </div>

          {esAdmin && (
            <ToggleClienteEstadoButton clienteId={c.id} estado={c.estado} />
          )}
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ContactCard icon={Phone}         label="Teléfono" value={c.telefono} />
          <ContactCard icon={MessageCircle} label="WhatsApp" value={c.whatsapp} />
          <ContactCard icon={Mail}          label="Email"    value={c.email} />
          <ContactCard
            icon={MapPin}
            label="Ubicación"
            value={
              [c.direccion, c.ciudad, c.provincia].filter(Boolean).join(", ") || null
            }
          />
        </section>

        {c.notas && (
          <section className="rounded-xl border border-tp-line-soft bg-tp-card p-5">
            <p className="font-mono text-[10.5px] text-tp-cyan tracking-[0.14em] uppercase mb-2">
              Notas internas
            </p>
            <p className="text-sm text-tp-secondary whitespace-pre-wrap">{c.notas}</p>
          </section>
        )}

        <p className="text-xs font-mono text-tp-muted">
          Creado {formatFechaHora(c.created_at)} · Actualizado {formatFechaHora(c.updated_at)}
        </p>

        {esAdmin && (
          <section className="pt-6 border-t border-tp-line-soft space-y-4">
            <h2 className="font-display text-xl font-semibold">Editar datos</h2>
            <ClienteForm
              mode="edit"
              clienteId={c.id}
              initial={{
                tipo: c.tipo,
                nombre: c.nombre,
                apellido: c.apellido,
                razon_social: c.razon_social,
                documento: c.documento,
                telefono: c.telefono,
                whatsapp: c.whatsapp,
                email: c.email,
                direccion: c.direccion,
                provincia: c.provincia,
                ciudad: c.ciudad,
                notas: c.notas,
              }}
            />
          </section>
        )}
      </div>
    </div>
  )
}

function ContactCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | null
}) {
  return (
    <div className="rounded-lg border border-tp-line-soft bg-tp-card p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-md bg-tp-surface-mid border border-tp-line flex items-center justify-center text-tp-cyan shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="font-mono text-[10px] text-tp-muted uppercase tracking-widest">
          {label}
        </p>
        <p className="text-sm text-tp-text mt-1 break-words">
          {value ?? <span className="text-tp-muted">—</span>}
        </p>
      </div>
    </div>
  )
}
