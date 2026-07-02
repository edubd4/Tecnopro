"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { MoneyInput, NumberInput } from "@/components/ui/number-input"
import { Select } from "@/components/ui/select"
import { agregarServicioAPresupuesto } from "@/app/(dashboard)/presupuestos/actions"

type ServicioOption = { id: string; id_publico: string; nombre: string; precio_base: number }

type Props = { presupuestoId: string; servicios: ServicioOption[] }

export function AgregarServicioPresForm({ presupuestoId, servicios }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [servicioId, setServicioId] = useState("")
  const [precio, setPrecio] = useState<number | null>(null)
  const [cantidad, setCantidad] = useState<number | null>(1)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleServicio(e: React.ChangeEvent<HTMLSelectElement>) {
    setServicioId(e.target.value)
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
      const result = await agregarServicioAPresupuesto({
        presupuesto_id: presupuestoId,
        servicio_id: servicioId,
        precio,
        cantidad,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
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
          <Label htmlFor="pres_srv" className="text-xs">Servicio</Label>
          <Select id="pres_srv" required value={servicioId} onChange={handleServicio}>
            <option value="">— Elegir servicio —</option>
            {servicios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id_publico} · {s.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-3 space-y-1">
          <Label htmlFor="pres_srv_precio" className="text-xs">Precio (ARS)</Label>
          <MoneyInput
            id="pres_srv_precio"
            min={0}
            required
            value={precio}
            onChange={setPrecio}
          />
        </div>
        <div className="sm:col-span-2 space-y-1">
          <Label htmlFor="pres_srv_cant" className="text-xs">Cantidad</Label>
          <NumberInput
            id="pres_srv_cant"
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
