"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createServicio, updateServicio } from "@/app/(dashboard)/catalogo/actions"
import type { ServicioInput } from "@/lib/validators/servicio"

type Props = {
  mode: "create" | "edit"
  servicioId?: string
  initial?: Partial<ServicioInput>
}

const DEFAULTS: ServicioInput = {
  nombre: "",
  descripcion: null,
  categoria: "REPARACION",
  precio_base: 0,
  tiempo_estimado_min: null,
  activo: true,
}

export function ServicioForm({ mode, servicioId, initial }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<ServicioInput>({ ...DEFAULTS, ...initial })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function update<K extends keyof ServicioInput>(key: K, value: ServicioInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createServicio(form)
          : await updateServicio(servicioId!, form)
      if (result && !result.ok) {
        setError(result.error)
        return
      }
      if (mode === "edit") router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-xl border border-tp-line-soft bg-tp-card p-6 space-y-5">
        <h2 className="font-display text-lg font-semibold">Servicio</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              required
              value={form.nombre}
              onChange={(e) => update("nombre", e.target.value)}
              placeholder="Ej. Reparación de PC de escritorio"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoria">Categoría</Label>
            <Select
              id="categoria"
              value={form.categoria}
              onChange={(e) => update("categoria", e.target.value as ServicioInput["categoria"])}
            >
              <option value="REPARACION">Reparación</option>
              <option value="REDES">Redes</option>
              <option value="ACONDICIONAMIENTO">Acondicionamiento</option>
              <option value="INSTALACION">Instalación</option>
              <option value="DIAGNOSTICO">Diagnóstico</option>
              <option value="OTRO">Otro</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="precio_base">Precio base (ARS)</Label>
            <Input
              id="precio_base"
              type="number"
              min="0"
              step="0.01"
              required
              value={form.precio_base}
              onChange={(e) => update("precio_base", Number(e.target.value))}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="tiempo_estimado_min">Tiempo estimado (minutos)</Label>
            <Input
              id="tiempo_estimado_min"
              type="number"
              min="1"
              value={form.tiempo_estimado_min ?? ""}
              onChange={(e) =>
                update("tiempo_estimado_min", e.target.value ? Number(e.target.value) : null)
              }
              placeholder="Opcional"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              rows={3}
              value={form.descripcion ?? ""}
              onChange={(e) => update("descripcion", e.target.value)}
              placeholder="Qué incluye el servicio."
            />
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-md border border-tp-red/40 bg-tp-red/10 px-4 py-3 text-sm text-tp-red">
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <Button variant="ghost" asChild disabled={isPending}>
          <Link href={mode === "create" ? "/catalogo" : `/catalogo/${servicioId}`}>
            Cancelar
          </Link>
        </Button>
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending
            ? mode === "create" ? "Creando…" : "Guardando…"
            : mode === "create" ? "Crear servicio" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  )
}
