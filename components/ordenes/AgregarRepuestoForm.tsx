"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { MoneyInput, NumberInput } from "@/components/ui/number-input"
import { Select } from "@/components/ui/select"
import { agregarRepuestoAOrden } from "@/app/(dashboard)/ordenes/items-actions"

type RepuestoOption = {
  id: string
  id_publico: string
  nombre: string
  precio_venta: number
  stock_actual: number
}

type Props = {
  ordenId: string
  repuestos: RepuestoOption[]
}

export function AgregarRepuestoForm({ ordenId, repuestos }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [repuestoId, setRepuestoId] = useState("")
  const [precio, setPrecio] = useState<number | null>(null)
  const [cantidad, setCantidad] = useState<number | null>(1)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const seleccionado = repuestos.find((r) => r.id === repuestoId)

  function handleRepuestoChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setRepuestoId(e.target.value)
    const r = repuestos.find((x) => x.id === e.target.value)
    if (r) setPrecio(r.precio_venta)
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
    if (seleccionado && cantidad > seleccionado.stock_actual) {
      setError(`Stock insuficiente: hay ${seleccionado.stock_actual} unidad(es) disponibles`)
      return
    }

    startTransition(async () => {
      const result = await agregarRepuestoAOrden({
        orden_id: ordenId,
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
        Agregar repuesto — descuenta stock automáticamente
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-7 space-y-1">
          <Label htmlFor="repuesto_id" className="text-xs">Repuesto</Label>
          <Select
            id="repuesto_id"
            required
            value={repuestoId}
            onChange={handleRepuestoChange}
          >
            <option value="">— Elegir repuesto —</option>
            {repuestos.map((r) => (
              <option key={r.id} value={r.id} disabled={r.stock_actual === 0}>
                {r.id_publico} · {r.nombre} (stock: {r.stock_actual})
              </option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-3 space-y-1">
          <Label htmlFor="precio" className="text-xs">Precio (ARS)</Label>
          <MoneyInput
            id="precio"
            min={0}
            required
            value={precio}
            onChange={setPrecio}
          />
        </div>
        <div className="sm:col-span-2 space-y-1">
          <Label htmlFor="cantidad" className="text-xs">Cantidad</Label>
          <NumberInput
            id="cantidad"
            min={1}
            max={seleccionado?.stock_actual}
            required
            value={cantidad}
            onChange={setCantidad}
          />
        </div>
      </div>

      {seleccionado && (
        <p className="text-[11px] font-mono text-tp-muted">
          Stock disponible: {seleccionado.stock_actual}
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-tp-red">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false)
            setError(null)
          }}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Agregando…" : "Agregar y descontar stock"}
        </Button>
      </div>
    </form>
  )
}
