"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { TableCell, TableRow } from "@/components/ui/table"
import { cn, formatFecha } from "@/lib/utils"
import { cambiarEstadoPresupuesto } from "@/app/(dashboard)/presupuestos/actions"
import { ESTADO_PRES_LABEL, ESTADO_PRES_VARIANT } from "@/lib/presupuestos-ui"

const ESTADOS = ["BORRADOR", "ENVIADO", "APROBADO", "RECHAZADO", "VENCIDO"] as const

type Cliente = {
  id_publico: string
  nombre: string
  apellido: string | null
  razon_social: string | null
  tipo: string
} | null

type Props = {
  id: string
  id_publico: string
  cliente_id: string | null
  titulo: string
  estado: string
  validez_hasta: string
  created_at: string
  clientes: Cliente
}

function nombreCliente(c: Cliente): string {
  if (!c) return "—"
  if (c.tipo === "EMPRESA") return c.razon_social ?? c.nombre
  return [c.nombre, c.apellido].filter(Boolean).join(" ")
}

export function PresupuestoListRow(props: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function goToPresupuesto() {
    router.push(`/presupuestos/${props.id}`)
  }

  function handleEstadoChange(e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation()
    const nuevo = e.target.value as typeof ESTADOS[number]
    if (nuevo === props.estado) return
    if ((nuevo === "RECHAZADO" || nuevo === "VENCIDO") && !window.confirm(`¿Marcar como ${ESTADO_PRES_LABEL[nuevo]}?`)) return

    startTransition(async () => {
      const result = await cambiarEstadoPresupuesto(props.id, { estado: nuevo })
      if (!result.ok) {
        alert(result.error)
        return
      }
      router.refresh()
    })
  }

  const variant = ESTADO_PRES_VARIANT[props.estado] ?? "gray"

  return (
    <TableRow
      className={cn("cursor-pointer", isPending && "opacity-60 pointer-events-none")}
      onClick={goToPresupuesto}
    >
      <TableCell className="font-mono text-tp-cyan">{props.id_publico}</TableCell>
      <TableCell className="text-tp-text font-medium">{props.titulo}</TableCell>
      <TableCell
        className="text-tp-text"
        onClick={(e) => e.stopPropagation()}
      >
        {props.cliente_id ? (
          <a
            href={`/clientes/${props.cliente_id}`}
            className="hover:text-tp-cyan hover:underline underline-offset-4"
            onClick={(e) => e.stopPropagation()}
          >
            {nombreCliente(props.clientes)}
          </a>
        ) : (
          nombreCliente(props.clientes)
        )}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <select
          value={props.estado}
          onChange={handleEstadoChange}
          disabled={isPending}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "text-xs font-mono uppercase tracking-wider rounded-md border px-2 py-1 cursor-pointer",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tp-cyan/50",
            estadoClasses(variant),
          )}
          aria-label="Cambiar estado"
        >
          {ESTADOS.map((e) => (
            <option key={e} value={e} className="bg-tp-card text-tp-text">
              {ESTADO_PRES_LABEL[e]}
            </option>
          ))}
        </select>
      </TableCell>
      <TableCell className="font-mono text-xs text-tp-muted">
        {formatFecha(props.validez_hasta)}
      </TableCell>
      <TableCell className="font-mono text-xs text-tp-muted">
        {formatFecha(props.created_at)}
      </TableCell>
    </TableRow>
  )
}

function estadoClasses(variant: string): string {
  switch (variant) {
    case "green":  return "border-tp-green/40  bg-tp-green/10  text-tp-green"
    case "cyan":   return "border-tp-cyan/40   bg-tp-cyan/10   text-tp-cyan"
    case "amber":  return "border-tp-amber/40  bg-tp-amber/10  text-tp-amber"
    case "red":    return "border-tp-red/40    bg-tp-red/10    text-tp-red"
    case "violet": return "border-tp-violet/40 bg-tp-violet/10 text-tp-violet"
    default:       return "border-tp-line      bg-tp-input     text-tp-secondary"
  }
}
