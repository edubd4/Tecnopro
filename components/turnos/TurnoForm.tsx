"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createTurno, updateTurno } from "@/app/(dashboard)/turnos/actions"
import type { TurnoCreateInput } from "@/lib/validators/turno"

type ClienteOption = { id: string; id_publico: string; label: string }
type TecnicoOption = { id: string; nombre: string; rol: string }
type OrdenOption = { id: string; id_publico: string; label: string }

type Props = {
  mode: "create" | "edit"
  turnoId?: string
  clientes: ClienteOption[]
  tecnicos: TecnicoOption[]
  ordenes: OrdenOption[]
  initial?: Partial<TurnoCreateInput>
}

const DEFAULTS: TurnoCreateInput = {
  titulo: "",
  descripcion: null,
  cliente_id: null,
  orden_id: null,
  tecnico_id: null,
  fecha_inicio: "",
  fecha_fin: "",
  color: null,
  notas_internas: null,
}

export function TurnoForm({ mode, turnoId, clientes, tecnicos, ordenes, initial }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<TurnoCreateInput>({ ...DEFAULTS, ...initial })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function update<K extends keyof TurnoCreateInput>(key: K, value: TurnoCreateInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createTurno(form)
          : await updateTurno(turnoId!, form)

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
        <h2 className="font-display text-lg font-semibold">Cuándo</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fecha_inicio">Inicio *</Label>
            <Input
              id="fecha_inicio"
              type="datetime-local"
              required
              value={form.fecha_inicio}
              onChange={(e) => {
                const nuevoInicio = e.target.value
                // Wave 3.4 · Si fecha_fin está vacía o es anterior al nuevo inicio,
                // sugerir fecha_fin = fecha_inicio + 1h. El user puede sobreescribir.
                setForm((prev) => {
                  const sugerirFin = !prev.fecha_fin || prev.fecha_fin <= nuevoInicio
                  let nuevaFin = prev.fecha_fin
                  if (sugerirFin && nuevoInicio) {
                    const d = new Date(nuevoInicio)
                    d.setHours(d.getHours() + 1)
                    const y = d.getFullYear()
                    const m = String(d.getMonth() + 1).padStart(2, "0")
                    const day = String(d.getDate()).padStart(2, "0")
                    const hh = String(d.getHours()).padStart(2, "0")
                    const mm = String(d.getMinutes()).padStart(2, "0")
                    nuevaFin = `${y}-${m}-${day}T${hh}:${mm}`
                  }
                  return { ...prev, fecha_inicio: nuevoInicio, fecha_fin: nuevaFin }
                })
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fecha_fin">Fin *</Label>
            <Input
              id="fecha_fin"
              type="datetime-local"
              required
              value={form.fecha_fin}
              onChange={(e) => update("fecha_fin", e.target.value)}
            />
            {form.fecha_inicio && (
              <p className="text-[11px] text-tp-muted">
                Se sugiere +1h al cambiar el inicio. Podés editarlo.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-tp-line-soft bg-tp-card p-6 space-y-5">
        <h2 className="font-display text-lg font-semibold">Qué</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              required
              value={form.titulo}
              onChange={(e) => update("titulo", e.target.value)}
              placeholder="Ej. Retirada equipo Fernández"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              rows={2}
              value={form.descripcion ?? ""}
              onChange={(e) => update("descripcion", e.target.value)}
              placeholder="Contexto del turno."
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-tp-line-soft bg-tp-card p-6 space-y-5">
        <h2 className="font-display text-lg font-semibold">Relación</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tecnico_id">Técnico asignado</Label>
            <Select
              id="tecnico_id"
              value={form.tecnico_id ?? ""}
              onChange={(e) => update("tecnico_id", e.target.value === "" ? null : e.target.value)}
            >
              <option value="">— Sin asignar —</option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre} {t.rol === "admin" ? "(admin)" : ""}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cliente_id">Cliente</Label>
            <Select
              id="cliente_id"
              value={form.cliente_id ?? ""}
              onChange={(e) => update("cliente_id", e.target.value === "" ? null : e.target.value)}
            >
              <option value="">— Sin cliente —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id_publico} · {c.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="orden_id">Orden vinculada</Label>
            <Select
              id="orden_id"
              value={form.orden_id ?? ""}
              onChange={(e) => update("orden_id", e.target.value === "" ? null : e.target.value)}
            >
              <option value="">— Sin orden —</option>
              {ordenes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.id_publico} · {o.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-tp-line-soft bg-tp-card p-6 space-y-3">
        <Label htmlFor="notas_internas">Notas internas</Label>
        <Textarea
          id="notas_internas"
          rows={2}
          value={form.notas_internas ?? ""}
          onChange={(e) => update("notas_internas", e.target.value)}
        />
      </section>

      {error && (
        <div role="alert" className="rounded-md border border-tp-red/40 bg-tp-red/10 px-4 py-3 text-sm text-tp-red">
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <Button variant="ghost" asChild disabled={isPending}>
          <Link href={mode === "create" ? "/turnos" : `/turnos/${turnoId}`}>
            Cancelar
          </Link>
        </Button>
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending
            ? mode === "create" ? "Creando…" : "Guardando…"
            : mode === "create" ? "Crear turno" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  )
}
