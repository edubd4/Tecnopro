"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { registrarMovimiento } from "@/app/(dashboard)/stock/actions"
import type { MovimientoInput } from "@/lib/validators/repuesto"

type Props = {
  repuestoId: string
  stockActual: number
}

export function MovimientoStockForm({ repuestoId, stockActual }: Props) {
  const router = useRouter()
  const [tipo, setTipo] = useState<MovimientoInput["tipo"]>("ENTRADA")
  const [cantidad, setCantidad] = useState<string>("")
  const [motivo, setMotivo] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setOk(false)

    const cantidadNum = Number(cantidad)
    if (!Number.isFinite(cantidadNum) || cantidadNum < 0) {
      setError("Cantidad inválida")
      return
    }

    startTransition(async () => {
      const result = await registrarMovimiento({
        repuesto_id: repuestoId,
        tipo,
        cantidad: cantidadNum,
        motivo: motivo || null,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setOk(true)
      setCantidad("")
      setMotivo("")
      router.refresh()
    })
  }

  const hint =
    tipo === "ENTRADA"
      ? `Suma al stock. Actual: ${stockActual}`
      : tipo === "SALIDA"
      ? `Resta del stock. Actual: ${stockActual}. No puede quedar negativo.`
      : `Ajuste absoluto: seteá el stock final. Actual: ${stockActual}.`

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="tipo">Tipo</Label>
          <Select
            id="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as MovimientoInput["tipo"])}
          >
            <option value="ENTRADA">Entrada</option>
            <option value="SALIDA">Salida</option>
            <option value="AJUSTE">Ajuste</option>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="cantidad">
            {tipo === "AJUSTE" ? "Stock final" : "Cantidad"}
          </Label>
          <Input
            id="cantidad"
            type="number"
            min="0"
            step="1"
            required
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            placeholder={tipo === "AJUSTE" ? "Cuántas hay" : "Cuántas mover"}
          />
        </div>
      </div>

      <p className="text-xs text-tp-muted font-mono">{hint}</p>

      <div className="space-y-2">
        <Label htmlFor="motivo">Motivo (opcional)</Label>
        <Textarea
          id="motivo"
          rows={2}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej. Compra a proveedor · Ajuste por conteo físico · Descarte"
        />
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-tp-red/40 bg-tp-red/10 px-4 py-2 text-sm text-tp-red">
          {error}
        </div>
      )}
      {ok && (
        <div className="rounded-md border border-tp-green/40 bg-tp-green/10 px-4 py-2 text-sm text-tp-green">
          Movimiento registrado.
        </div>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Guardando…" : "Registrar movimiento"}
      </Button>
    </form>
  )
}
