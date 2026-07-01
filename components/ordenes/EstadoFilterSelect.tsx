"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { cn } from "@/lib/utils"

const OPCIONES = [
  { value: "",              label: "Todos los estados" },
  { value: "ACTIVAS",       label: "Activas (no entregadas ni canceladas)" },
  { value: "RECIBIDA",      label: "Recibida" },
  { value: "DIAGNOSTICO",   label: "En diagnóstico" },
  { value: "PRESUPUESTADA", label: "Presupuestada" },
  { value: "EN_REPARACION", label: "En reparación" },
  { value: "LISTA",         label: "Lista para entrega" },
  { value: "ENTREGADA",     label: "Entregada" },
  { value: "CANCELADA",     label: "Cancelada" },
]

export function EstadoFilterSelect() {
  const router = useRouter()
  const params = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const actual = params.get("estado") ?? ""

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const sp = new URLSearchParams(params.toString())
    if (e.target.value) sp.set("estado", e.target.value)
    else sp.delete("estado")
    const qs = sp.toString()
    startTransition(() => {
      router.replace(qs ? `/ordenes?${qs}` : "/ordenes")
    })
  }

  return (
    <select
      value={actual}
      onChange={handleChange}
      disabled={isPending}
      className={cn(
        "h-10 rounded-md border border-tp-line bg-tp-input px-3 text-sm text-tp-text",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tp-cyan/50"
      )}
    >
      {OPCIONES.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
