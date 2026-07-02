"use client"

import { useRouter } from "next/navigation"
import { TableCell, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn, formatFechaHora, formatPesos } from "@/lib/utils"
import {
  TIPO_MOV_CAJA_LABEL,
  TIPO_MOV_CAJA_VARIANT,
  ORIGEN_MOV_CAJA_LABEL,
  METODO_PAGO_LABEL,
} from "@/lib/caja-ui"

type Props = {
  id: string
  id_publico: string
  tipo: string
  origen: string
  monto: number
  metodo_pago: string
  descripcion: string
  orden_id: string | null
  fecha: string
  orden_id_publico: string | null
}

export function MovimientoListRow(props: Props) {
  const router = useRouter()
  const clickeable = !!props.orden_id

  return (
    <TableRow
      className={cn(clickeable && "cursor-pointer")}
      onClick={clickeable ? () => router.push(`/ordenes/${props.orden_id}`) : undefined}
    >
      <TableCell className="font-mono text-tp-cyan">{props.id_publico}</TableCell>
      <TableCell>
        <Badge variant={TIPO_MOV_CAJA_VARIANT[props.tipo] ?? "gray"}>
          {TIPO_MOV_CAJA_LABEL[props.tipo] ?? props.tipo}
        </Badge>
      </TableCell>
      <TableCell className="text-tp-secondary text-xs font-mono uppercase tracking-wider">
        {ORIGEN_MOV_CAJA_LABEL[props.origen] ?? props.origen}
      </TableCell>
      <TableCell className="text-tp-text">
        <div>{props.descripcion}</div>
        {props.orden_id_publico && (
          <div className="font-mono text-[10.5px] text-tp-muted mt-0.5">
            → {props.orden_id_publico}
          </div>
        )}
      </TableCell>
      <TableCell className="text-tp-secondary text-xs">
        {METODO_PAGO_LABEL[props.metodo_pago] ?? props.metodo_pago}
      </TableCell>
      <TableCell
        className={cn(
          "text-right font-mono font-semibold",
          props.tipo === "INGRESO" ? "text-tp-green" : "text-tp-red",
        )}
      >
        {props.tipo === "INGRESO" ? "+" : "−"} {formatPesos(props.monto)}
      </TableCell>
      <TableCell className="font-mono text-xs text-tp-muted">
        {formatFechaHora(props.fecha)}
      </TableCell>
    </TableRow>
  )
}
