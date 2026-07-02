"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { MoneyInput, NumberInput } from "@/components/ui/number-input"
import { Select } from "@/components/ui/select"
import { agregarRepuestoAPresupuesto } from "@/app/(dashboard)/presupuestos/actions"

type RepuestoOption = {
  id: string
  id_publico: string
  nombre: string
  costo: number
  precio_venta: number
}

type Props = {
  presupuestoId: string
  repuestos: RepuestoOption[]
  margenPct: number
}

export function AgregarRepuestoPresForm({ presupuestoId, repuestos, margenPct }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [repuestoId, setRepuestoId] = useState("")
  const [precio, setPrecio] = useState<number | null>(null)
  const [cantidad, setCantidad] = useState<number | null>(1)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleRepuesto(e: React.ChangeEvent<HTMLSelectElement>) {
    setRepuestoId(e.target.value)
    const r = repuestos.find((x) => x.id === e.target.value)
    if (r) {
      // Sugerimos costo × (1 + margen/100). El usuario puede sobreescribir.
      const sugerido = Number(r.costo) * (1 + margenPct / 100)
      setPrecio(Math.round(sugerido))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!repuestoId) {
      setError("Elegí un repuesto")
      return
    }
    if (precio === null || cantidad === null || cantidad <= 0) {
      setError("Precio y cantidad válidos requeridos")
      return
    }
    startTransition(async () => {
      const result = await agregarRepuestoAPresupuesto({
        presupuesto_id: presupuestoId,
        repuesto_id: repuestoId,
        precio_unitario: precio,
        cantidad,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setRepuestoId("")
      setPrecio(null)
      setCantidad(1)
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" />
        Agregar repuesto
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-tp-cyan/30 bg-tp-surface-mid/40 p-4 space-y-3">
      <p className="font-mono text-[11px] text-tp-cyan uppercase tracking-widest">
        Agregar repuesto — sin descuento de stock (es cotización)
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-7 space-y-1">
          <Label htmlFor="pres_rep" className="text-xs">Repuesto</Label>
          <Select id="pres_rep" required value={repuestoId} onChange={handleRepuesto}>
            <option value="">— Elegir repuesto —</option>
            {repuestos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id_publico} · {r.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-3 space-y-1">
          <Label htmlFor="pres_rep_precio" className="text-xs">
            Precio unit. (con margen {margenPct}%)
          </Label>
          <MoneyInput
            id="pres_rep_precio"
            min={0}
            required
            value={precio}
            onChange={setPrecio}
          />
        </div>
        <div className="sm:col-span-2 space-y-1">
          <Label htmlFor="pres_rep_cant" className="text-xs">Cantidad</Label>
          <NumberInput
            id="pres_rep_cant"
            min={1}
            required
            value={cantidad}
            onChange={setCantidad}
          />
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-tp-red">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Agregando…" : "Agregar"}
        </Button>
      </div>
    </form>
  )
}
