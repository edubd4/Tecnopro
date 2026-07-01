"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createCliente, updateCliente } from "@/app/(dashboard)/clientes/actions"
import type { ClienteInput } from "@/lib/validators/cliente"

type ClienteFormProps = {
  mode: "create" | "edit"
  clienteId?: string
  initial?: Partial<ClienteInput>
}

const DEFAULTS: ClienteInput = {
  tipo: "PARTICULAR",
  nombre: "",
  apellido: null,
  razon_social: null,
  documento: null,
  telefono: null,
  whatsapp: null,
  email: null,
  direccion: null,
  provincia: null,
  ciudad: null,
  notas: null,
}

export function ClienteForm({ mode, clienteId, initial }: ClienteFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<ClienteInput>({ ...DEFAULTS, ...initial })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function update<K extends keyof ClienteInput>(key: K, value: ClienteInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createCliente(form)
          : await updateCliente(clienteId!, form)

      if (result && !result.ok) {
        setError(result.error)
        return
      }
      // create hace redirect desde el server. update retorna { ok: true }:
      if (mode === "edit") router.refresh()
    })
  }

  const esEmpresa = form.tipo === "EMPRESA"

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-xl border border-tp-line-soft bg-tp-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Datos generales</h2>
          <p className="font-mono text-[10.5px] text-tp-muted uppercase tracking-[0.12em]">
            Obligatorios: nombre {esEmpresa && "· razón social"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de cliente</Label>
            <Select
              id="tipo"
              value={form.tipo}
              onChange={(e) => update("tipo", e.target.value as ClienteInput["tipo"])}
            >
              <option value="PARTICULAR">Particular</option>
              <option value="EMPRESA">Empresa</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="documento">DNI / CUIT</Label>
            <Input
              id="documento"
              value={form.documento ?? ""}
              onChange={(e) => update("documento", e.target.value)}
              placeholder={esEmpresa ? "30-XXXXXXXX-X" : "DNI"}
            />
          </div>

          {esEmpresa ? (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="razon_social">Razón social *</Label>
              <Input
                id="razon_social"
                required
                value={form.razon_social ?? ""}
                onChange={(e) => update("razon_social", e.target.value)}
                placeholder="Nombre legal de la empresa"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="nombre">{esEmpresa ? "Contacto" : "Nombre"} *</Label>
            <Input
              id="nombre"
              required
              value={form.nombre}
              onChange={(e) => update("nombre", e.target.value)}
              placeholder={esEmpresa ? "Persona de contacto" : "Nombre"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apellido">Apellido</Label>
            <Input
              id="apellido"
              value={form.apellido ?? ""}
              onChange={(e) => update("apellido", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-tp-line-soft bg-tp-card p-6 space-y-5">
        <h2 className="font-display text-lg font-semibold">Contacto</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              value={form.telefono ?? ""}
              onChange={(e) => update("telefono", e.target.value)}
              placeholder="Ej. 351 555-1234"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              value={form.whatsapp ?? ""}
              onChange={(e) => update("whatsapp", e.target.value)}
              placeholder="Puede ser el mismo teléfono"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email ?? ""}
              onChange={(e) => update("email", e.target.value)}
              placeholder="cliente@dominio.com"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-tp-line-soft bg-tp-card p-6 space-y-5">
        <h2 className="font-display text-lg font-semibold">Ubicación</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              value={form.direccion ?? ""}
              onChange={(e) => update("direccion", e.target.value)}
              placeholder="Calle y número"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ciudad">Ciudad</Label>
            <Input
              id="ciudad"
              value={form.ciudad ?? ""}
              onChange={(e) => update("ciudad", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="provincia">Provincia</Label>
            <Input
              id="provincia"
              value={form.provincia ?? ""}
              onChange={(e) => update("provincia", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-tp-line-soft bg-tp-card p-6 space-y-3">
        <Label htmlFor="notas">Notas internas</Label>
        <Textarea
          id="notas"
          rows={4}
          value={form.notas ?? ""}
          onChange={(e) => update("notas", e.target.value)}
          placeholder="Cualquier observación útil sobre el cliente."
        />
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-tp-red/40 bg-tp-red/10 px-4 py-3 text-sm text-tp-red"
        >
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <Button variant="ghost" asChild disabled={isPending}>
          <Link href={mode === "create" ? "/clientes" : `/clientes/${clienteId}`}>
            Cancelar
          </Link>
        </Button>
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending
            ? mode === "create"
              ? "Creando…"
              : "Guardando…"
            : mode === "create"
            ? "Crear cliente"
            : "Guardar cambios"}
        </Button>
      </div>
    </form>
  )
}
