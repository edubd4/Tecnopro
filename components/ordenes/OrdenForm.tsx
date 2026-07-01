"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createOrden, updateOrden } from "@/app/(dashboard)/ordenes/actions"
import type { OrdenUpdateInput } from "@/lib/validators/orden"

type ClienteOption = { id: string; id_publico: string; label: string }
type TecnicoOption = { id: string; nombre: string; rol: string }

type Props = {
  mode: "create" | "edit"
  ordenId?: string
  clientes: ClienteOption[]
  tecnicos: TecnicoOption[]
  initial?: Partial<OrdenUpdateInput> & { estado_actual?: string }
}

export function OrdenForm({ mode, ordenId, clientes, tecnicos, initial }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<OrdenUpdateInput>({
    cliente_id: initial?.cliente_id ?? "",
    equipo_desc: initial?.equipo_desc ?? null,
    falla_declarada: initial?.falla_declarada ?? null,
    diagnostico: initial?.diagnostico ?? null,
    prioridad: initial?.prioridad ?? "NORMAL",
    tecnico_asignado_id: initial?.tecnico_asignado_id ?? null,
    fecha_entrega_estimada: initial?.fecha_entrega_estimada ?? null,
    notas_internas: initial?.notas_internas ?? null,
  })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function update<K extends keyof OrdenUpdateInput>(key: K, value: OrdenUpdateInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.cliente_id) {
      setError("Elegí un cliente para la orden")
      return
    }

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createOrden({
              cliente_id: form.cliente_id,
              equipo_desc: form.equipo_desc,
              falla_declarada: form.falla_declarada,
              prioridad: form.prioridad,
              tecnico_asignado_id: form.tecnico_asignado_id,
              fecha_entrega_estimada: form.fecha_entrega_estimada,
              notas_internas: form.notas_internas,
            })
          : await updateOrden(ordenId!, form)

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
        <h2 className="font-display text-lg font-semibold">Cliente y equipo</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cliente_id">Cliente *</Label>
            <Select
              id="cliente_id"
              required
              value={form.cliente_id}
              onChange={(e) => update("cliente_id", e.target.value)}
              disabled={mode === "edit"}
            >
              <option value="">— Elegir cliente —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id_publico} · {c.label}
                </option>
              ))}
            </Select>
            {mode === "edit" && (
              <p className="text-[11px] text-tp-muted">
                No se puede cambiar el cliente de una orden ya creada.
              </p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="equipo_desc">Equipo (marca / modelo / serie)</Label>
            <Input
              id="equipo_desc"
              value={form.equipo_desc ?? ""}
              onChange={(e) => update("equipo_desc", e.target.value)}
              placeholder="Ej. Notebook Lenovo IdeaPad · S/N XY1234"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="falla_declarada">Falla declarada por el cliente</Label>
            <Textarea
              id="falla_declarada"
              rows={3}
              value={form.falla_declarada ?? ""}
              onChange={(e) => update("falla_declarada", e.target.value)}
              placeholder="Lo que trae el cliente en sus palabras."
            />
          </div>

          {mode === "edit" && (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="diagnostico">Diagnóstico técnico</Label>
              <Textarea
                id="diagnostico"
                rows={3}
                value={form.diagnostico ?? ""}
                onChange={(e) => update("diagnostico", e.target.value)}
                placeholder="Lo que encontró el técnico al revisar el equipo."
              />
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-tp-line-soft bg-tp-card p-6 space-y-5">
        <h2 className="font-display text-lg font-semibold">Gestión</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="prioridad">Prioridad</Label>
            <Select
              id="prioridad"
              value={form.prioridad}
              onChange={(e) => update("prioridad", e.target.value as OrdenUpdateInput["prioridad"])}
            >
              <option value="BAJA">Baja</option>
              <option value="NORMAL">Normal</option>
              <option value="ALTA">Alta</option>
              <option value="URGENTE">Urgente</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tecnico_asignado_id">Técnico asignado</Label>
            <Select
              id="tecnico_asignado_id"
              value={form.tecnico_asignado_id ?? ""}
              onChange={(e) =>
                update("tecnico_asignado_id", e.target.value === "" ? null : e.target.value)
              }
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
            <Label htmlFor="fecha_entrega_estimada">Entrega estimada</Label>
            <Input
              id="fecha_entrega_estimada"
              type="date"
              value={form.fecha_entrega_estimada ?? ""}
              onChange={(e) => update("fecha_entrega_estimada", e.target.value || null)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notas_internas">Notas internas</Label>
            <Textarea
              id="notas_internas"
              rows={2}
              value={form.notas_internas ?? ""}
              onChange={(e) => update("notas_internas", e.target.value)}
              placeholder="No se muestran al cliente."
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
          <Link href={mode === "create" ? "/ordenes" : `/ordenes/${ordenId}`}>
            Cancelar
          </Link>
        </Button>
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending
            ? mode === "create" ? "Creando…" : "Guardando…"
            : mode === "create" ? "Crear orden" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  )
}
