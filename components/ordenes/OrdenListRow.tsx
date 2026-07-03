"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { TableCell, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { cn } from "@/lib/utils"
import { cambiarEstadoOrden } from "@/app/(dashboard)/ordenes/actions"
import { formatFecha } from "@/lib/utils"
import { ESTADO_ORDEN_LABEL, ESTADO_ORDEN_VARIANT, PRIORIDAD_LABEL, PRIORIDAD_VARIANT } from "@/lib/ordenes-ui"

const ESTADOS = [
  "RECIBIDA",
  "DIAGNOSTICO",
  "PRESUPUESTADA",
  "EN_REPARACION",
  "LISTA",
  "ENTREGADA",
  "CANCELADA",
] as const

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
  estado: string
  prioridad: string
  equipo_desc: string | null
  fecha_recepcion: string
  clientes: Cliente
  tecnico: { nombre: string } | null
}

function nombreCliente(c: Cliente): string {
  if (!c) return "—"
  if (c.tipo === "EMPRESA") return c.razon_social ?? c.nombre
  return [c.nombre, c.apellido].filter(Boolean).join(" ")
}

export function OrdenListRow(props: Props) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const [isPending, startTransition] = useTransition()

  function goToOrden() {
    router.push(`/ordenes/${props.id}`)
  }

  async function handleEstadoChange(e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation()
    const nuevo = e.target.value as typeof ESTADOS[number]
    if (nuevo === props.estado) return

    if (nuevo === "CANCELADA") {
      const ok = await confirm({
        title: `¿Cancelar la orden ${props.id_publico}?`,
        description: "La orden queda con estado CANCELADA. Podés revertirla cambiando el estado.",
        confirmLabel: "Cancelar orden",
        tone: "danger",
      })
      if (!ok) return
    }

    startTransition(async () => {
      const result = await cambiarEstadoOrden(props.id, { estado: nuevo })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(`${props.id_publico}: ${ESTADO_ORDEN_LABEL[nuevo] ?? nuevo}`)
      router.refresh()
    })
  }

  return (
    <TableRow
      className={cn(
        "cursor-pointer",
        isPending && "opacity-60 pointer-events-none"
      )}
      onClick={goToOrden}
    >
      <TableCell className="font-mono text-tp-cyan">
        {props.id_publico}
      </TableCell>

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

      <TableCell className="text-tp-muted text-sm">
        {props.equipo_desc ?? "—"}
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
            estadoClasses(props.estado)
          )}
          aria-label="Cambiar estado"
        >
          {ESTADOS.map((e) => (
            <option key={e} value={e} className="bg-tp-card text-tp-text">
              {ESTADO_ORDEN_LABEL[e] ?? e}
            </option>
          ))}
        </select>
      </TableCell>

      <TableCell>
        <Badge variant={PRIORIDAD_VARIANT[props.prioridad] ?? "gray"}>
          {PRIORIDAD_LABEL[props.prioridad] ?? props.prioridad}
        </Badge>
      </TableCell>

      <TableCell className="text-tp-muted text-sm">
        {props.tecnico?.nombre ?? "Sin asignar"}
      </TableCell>

      <TableCell className="font-mono text-xs text-tp-muted">
        {formatFecha(props.fecha_recepcion)}
      </TableCell>
    </TableRow>
  )
}

// Colores del select según estado — misma paleta que Badge para consistencia
function estadoClasses(estado: string): string {
  const variant = ESTADO_ORDEN_VARIANT[estado] ?? "gray"
  switch (variant) {
    case "green":  return "border-tp-green/40  bg-tp-green/10  text-tp-green"
    case "cyan":   return "border-tp-cyan/40   bg-tp-cyan/10   text-tp-cyan"
    case "amber":  return "border-tp-amber/40  bg-tp-amber/10  text-tp-amber"
    case "red":    return "border-tp-red/40    bg-tp-red/10    text-tp-red"
    case "violet": return "border-tp-violet/40 bg-tp-violet/10 text-tp-violet"
    default:       return "border-tp-line      bg-tp-input     text-tp-secondary"
  }
}
