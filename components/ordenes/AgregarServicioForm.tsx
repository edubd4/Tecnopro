"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { MoneyInput, NumberInput } from "@/components/ui/number-input"
import { Select } from "@/components/ui/select"
import { agregarServicioAOrden } from "@/app/(dashboard)/ordenes/items-actions"

type ServicioOption = {
  id: string
  id_publico: string
  nombre: string
  precio_base: number
}

type Props = {
  ordenId: string
  servicios: ServicioOption[]
}

export function AgregarServicioForm({ ordenId, servicios }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [servicioId, setServicioId] = useState("")
  const [precio, setPrecio] = useState<number | null>(null)
  const [cantidad, setCantidad] = useState<number | null>(1)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleServicioChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setServicioId(e.target.value)
    // Prefill del precio con el precio_base del servicio elegido
    const s = servicios.find((x) => x.id === e.target.value)
    if (s) setPrecio(s.precio_base)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!servicioId) {
      setError("Elegí un servicio")
      return
    }
    if (precio === null || cantidad === null || cantidad <= 0) {
      setError("Precio y cantidad válidos requeridos")
      return
    }
    startTransition(async () => {
      const result = await agregarServicioAOrden({
        orden_id: ordenId,
        servicio_id: servicioId,
        precio,
        cantidad,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      // Reset y cerrar
      setServicioId("")
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
        Agregar servicio
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-tp-cyan/30 bg-tp-surface-mid/40 p-4 space-y-3">
      <p className="font-mono text-[11px] text-tp-cyan uppercase tracking-widest">
        Agregar servicio del catálogo
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-7 space-y-1">
          <Label htmlFor="servicio_id" className="text-xs">Servicio</Label>
          <Select
            id="servicio_id"
            required
            value={servicioId}
            onChange={handleServicioChange}
          >
            <option value="">— Elegir servicio —</option>
            {servicios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id_publico} · {s.nombre}
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
            required
            value={cantidad}
            onChange={setCantidad}
          />
        </div>
      </div>

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
          {isPending ? "Agregando…" : "Agregar"}
        </Button>
      </div>
    </form>
  )
}
