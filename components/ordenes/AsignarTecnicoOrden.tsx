"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { asignarTecnicoOrden } from "@/app/(dashboard)/ordenes/actions"

type TecnicoOption = { id: string; nombre: string; rol: string }

type Props = {
  ordenId: string
  tecnicoActualId: string | null
  tecnicos: TecnicoOption[]
}

export function AsignarTecnicoOrden({ ordenId, tecnicoActualId, tecnicos }: Props) {
  const router = useRouter()
  const [seleccion, setSeleccion] = useState(tecnicoActualId ?? "")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleClick() {
    const nuevo = seleccion === "" ? null : seleccion
    if (nuevo === tecnicoActualId) return

    setError(null)
    startTransition(async () => {
      const result = await asignarTecnicoOrden(ordenId, nuevo)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  const cambio = (seleccion === "" ? null : seleccion) !== tecnicoActualId

  return (
    <div className="rounded-xl border border-tp-line-soft bg-tp-card p-5 space-y-3">
      <div>
        <p className="font-mono text-[10.5px] text-tp-cyan tracking-[0.14em] uppercase">
          Asignación
        </p>
        <h3 className="font-display text-base font-semibold mt-1">Técnico responsable</h3>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1 space-y-2">
          <Select value={seleccion} onChange={(e) => setSeleccion(e.target.value)}>
            <option value="">— Sin asignar —</option>
            {tecnicos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre} {t.rol === "admin" ? "(admin)" : ""}
              </option>
            ))}
          </Select>
        </div>
        <Button type="button" onClick={handleClick} disabled={!cambio || isPending}>
          {isPending ? "Guardando…" : "Aplicar"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-tp-red">
          {error}
        </p>
      )}
    </div>
  )
}
