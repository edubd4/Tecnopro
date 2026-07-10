"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast"
import { MoneyInput, NumberInput } from "@/components/ui/number-input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createServicio, updateServicio } from "@/app/(dashboard)/catalogo/actions"
import type { ServicioInput } from "@/lib/validators/servicio"

type Props = {
  mode: "create" | "edit"
  servicioId?: string
  initial?: Partial<ServicioInput>
}

type TiempoUnidad = "min" | "h" | "d"

const DEFAULTS: ServicioInput = {
  nombre: "",
  descripcion: null,
  categoria: "REPARACION",
  precio_base: 0,
  tiempo_estimado_min: null,
  activo: true,
}

// Inferimos la unidad más natural de un valor en minutos.
// 480 min = 8h (día laboral) → "h"; 1440 min = 1 día → "d"; 30 min → "min".
function inferirUnidad(min: number | null): { valor: number | null; unidad: TiempoUnidad } {
  if (min === null || min === 0) return { valor: null, unidad: "min" }
  if (min % 1440 === 0) return { valor: min / 1440, unidad: "d" }
  if (min % 60 === 0) return { valor: min / 60, unidad: "h" }
  return { valor: min, unidad: "min" }
}

function toMinutos(valor: number | null, unidad: TiempoUnidad): number | null {
  if (valor === null || valor === 0) return null
  if (unidad === "d") return valor * 1440
  if (unidad === "h") return valor * 60
  return valor
}

export function ServicioForm({ mode, servicioId, initial }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [form, setForm] = useState<ServicioInput>({ ...DEFAULTS, ...initial })
  const inicial = inferirUnidad(initial?.tiempo_estimado_min ?? null)
  const [tiempoValor, setTiempoValor] = useState<number | null>(inicial.valor)
  const [tiempoUnidad, setTiempoUnidad] = useState<TiempoUnidad>(inicial.unidad)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function update<K extends keyof ServicioInput>(key: K, value: ServicioInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // Sincronizamos form.tiempo_estimado_min con los dos inputs (valor + unidad).
  function updateTiempo(valor: number | null, unidad: TiempoUnidad) {
    setTiempoValor(valor)
    setTiempoUnidad(unidad)
    update("tiempo_estimado_min", toMinutos(valor, unidad))
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
      if (mode === "edit") {
        toast.success("Cambios guardados")
        router.refresh()
      }
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
            <MoneyInput
              id="precio_base"
              min={0}
              required
              value={form.precio_base}
              onChange={(v) => update("precio_base", v ?? 0)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="tiempo_valor">Tiempo estimado</Label>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <NumberInput
                  id="tiempo_valor"
                  min={1}
                  value={tiempoValor}
                  onChange={(v) => updateTiempo(v, tiempoUnidad)}
                  placeholder="Opcional"
                />
              </div>
              <Select
                id="tiempo_unidad"
                aria-label="Unidad de tiempo"
                value={tiempoUnidad}
                onChange={(e) => updateTiempo(tiempoValor, e.target.value as TiempoUnidad)}
              >
                <option value="min">Minutos</option>
                <option value="h">Horas</option>
                <option value="d">Días</option>
              </Select>
            </div>
            <p className="text-[11px] text-tp-muted">
              Se guarda internamente en minutos. Usá la unidad más cómoda para vos.
            </p>
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
