"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MoneyInput } from "@/components/ui/number-input"
import { Select } from "@/components/ui/select"
import { cobrarOrden } from "@/app/(dashboard)/caja/actions"
import { METODO_PAGO_LABEL } from "@/lib/caja-ui"

const METODOS = [
  "EFECTIVO",
  "TRANSFERENCIA",
  "TARJETA_DEBITO",
  "TARJETA_CREDITO",
  "MERCADO_PAGO",
  "OTRO",
] as const

type Props = {
  ordenId: string
  ordenIdPublico: string
  saldoSugerido: number
}

export function CobrarOrdenForm({ ordenId, ordenIdPublico, saldoSugerido }: Props) {
  const router = useRouter()
  const [monto, setMonto] = useState<number>(saldoSugerido)
  const [metodo, setMetodo] = useState<typeof METODOS[number]>("EFECTIVO")
  const [descripcion, setDescripcion] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!monto || monto <= 0) {
      setError("El monto debe ser mayor a 0")
      return
    }
    startTransition(async () => {
      const result = await cobrarOrden({
        orden_id: ordenId,
        monto,
        metodo_pago: metodo,
        descripcion: descripcion || undefined,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setDescripcion("")
      router.refresh()
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="pt-4 border-t border-tp-line-soft space-y-4"
    >
      <p className="font-mono text-[10.5px] text-tp-cyan tracking-[0.14em] uppercase">
        Registrar cobro
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="cobrar-monto">Monto (ARS) *</Label>
          <MoneyInput
            id="cobrar-monto"
            min={1}
            required
            value={monto || null}
            onChange={(v) => setMonto(v ?? 0)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cobrar-metodo">Método *</Label>
          <Select
            id="cobrar-metodo"
            required
            value={metodo}
            onChange={(e) => setMetodo(e.target.value as typeof METODOS[number])}
          >
            {METODOS.map((m) => (
              <option key={m} value={m}>
                {METODO_PAGO_LABEL[m]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cobrar-descripcion">Descripción</Label>
          <Input
            id="cobrar-descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder={`Cobro de orden ${ordenIdPublico}`}
          />
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-tp-red/40 bg-tp-red/10 px-4 py-2 text-sm text-tp-red">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Registrando…" : "Registrar cobro"}
        </Button>
      </div>
    </form>
  )
}
