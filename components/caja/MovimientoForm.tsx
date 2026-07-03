"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { TrendingDown, TrendingUp, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MoneyInput } from "@/components/ui/number-input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { crearMovimiento } from "@/app/(dashboard)/caja/actions"
import { crearGasto } from "@/app/(dashboard)/gastos/actions"
import { cn } from "@/lib/utils"
import { METODO_PAGO_LABEL } from "@/lib/caja-ui"

// ============================================================================
// MovimientoForm — Wave 1.5 · Caja absorbe Gastos.
//
// UI en 3 pasos:
//   1. ¿Entra o sale plata?        (Entra / Sale)
//   2. Motivo                       (opciones legibles según entra/sale)
//   3. Monto + método + detalle
//
// Cuando el usuario elige "Gasto categorizado" en una salida, aparece el
// campo Categoría (dropdown de categorías activas) y al submit se registra
// el gasto vía RPC (crea el movimiento_caja + fila en gastos en atómico).
// Para los demás motivos, se crea directo un movimiento_caja.
// ============================================================================

type CategoriaOption = { id: number; nombre: string }

type Props = {
  categoriasGasto: CategoriaOption[]
}

type Direccion = "ENTRA" | "SALE"

// Motivos como opciones UI. Cada uno mapea a un flujo concreto.
type MotivoIngreso =
  | "INGRESO_PUNTUAL"
  | "APERTURA_CAJA"
  | "AJUSTE_MAS"

type MotivoEgreso =
  | "GASTO_CATEGORIZADO"
  | "CIERRE_CAJA"
  | "AJUSTE_MENOS"
  | "EGRESO_PUNTUAL"

type Motivo = MotivoIngreso | MotivoEgreso

const MOTIVOS_INGRESO: { value: MotivoIngreso; label: string; helper: string }[] = [
  { value: "INGRESO_PUNTUAL", label: "Ingreso puntual", helper: "Un ingreso que no viene de una orden ni de una apertura." },
  { value: "APERTURA_CAJA",   label: "Apertura de caja", helper: "Cargar fondo inicial al empezar el día." },
  { value: "AJUSTE_MAS",      label: "Ajuste (encontré plata de más)", helper: "Al contar la caja detectaste más plata que la que dice el sistema." },
]

const MOTIVOS_EGRESO: { value: MotivoEgreso; label: string; helper: string }[] = [
  { value: "GASTO_CATEGORIZADO", label: "Gasto (con categoría)",             helper: "Proveedores, servicios, sueldos, impuestos, etc. Categorizado para reportes." },
  { value: "CIERRE_CAJA",        label: "Cierre de caja",                    helper: "Registrar el retiro al cierre del día." },
  { value: "AJUSTE_MENOS",       label: "Ajuste (falta plata)",              helper: "Al contar la caja detectaste menos plata que la que dice el sistema." },
  { value: "EGRESO_PUNTUAL",     label: "Egreso puntual (sin categoría)",    helper: "Egreso chico o que no amerita categorizar como gasto." },
]

const METODOS = [
  "EFECTIVO",
  "TRANSFERENCIA",
  "TARJETA_DEBITO",
  "TARJETA_CREDITO",
  "MERCADO_PAGO",
  "OTRO",
] as const

export function MovimientoForm({ categoriasGasto }: Props) {
  const [direccion, setDireccion] = useState<Direccion>("SALE")
  const [motivo, setMotivo] = useState<Motivo>("EGRESO_PUNTUAL")
  const [monto, setMonto] = useState<number | null>(null)
  const [metodo, setMetodo] = useState<typeof METODOS[number]>("EFECTIVO")
  const [descripcion, setDescripcion] = useState("")
  const [notas, setNotas] = useState("")
  const [categoriaId, setCategoriaId] = useState<number | null>(
    categoriasGasto[0]?.id ?? null,
  )
  const [fechaGasto, setFechaGasto] = useState<string>(hoyISO())

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const motivosDisponibles = direccion === "ENTRA" ? MOTIVOS_INGRESO : MOTIVOS_EGRESO
  const motivoActual =
    motivosDisponibles.find((m) => m.value === motivo) ?? motivosDisponibles[0]
  const esGasto = direccion === "SALE" && motivo === "GASTO_CATEGORIZADO"

  function handleCambiarDireccion(nueva: Direccion) {
    setDireccion(nueva)
    // Reseteamos motivo al primero del set nuevo
    setMotivo(nueva === "ENTRA" ? "INGRESO_PUNTUAL" : "EGRESO_PUNTUAL")
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!monto || monto <= 0) {
      setError("El monto debe ser mayor a 0")
      return
    }
    if (!descripcion.trim()) {
      setError("La descripción es obligatoria")
      return
    }

    startTransition(async () => {
      if (esGasto) {
        if (!categoriaId) {
          setError("Elegí una categoría de gasto")
          return
        }
        const result = await crearGasto({
          categoria_id: categoriaId,
          monto,
          descripcion: descripcion.trim(),
          fecha: fechaGasto,
          metodo_pago: metodo,
          notas: notas.trim() || null,
        })
        if (result && !result.ok) setError(result.error)
        // Si es ok, crearGasto redirige a /caja
        return
      }

      // Movimiento simple de caja
      const origen = motivoAOrigen(motivo)
      const tipo: "INGRESO" | "EGRESO" = direccion === "ENTRA" ? "INGRESO" : "EGRESO"
      const result = await crearMovimiento({
        tipo,
        origen,
        monto,
        metodo_pago: metodo,
        descripcion: descripcion.trim(),
        orden_id: null,
      })
      if (result && !result.ok) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Paso 1 · Dirección */}
      <section className="rounded-xl border border-tp-line-soft bg-tp-card p-6 space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold">¿Entra o sale plata?</h2>
          <p className="text-sm text-tp-secondary mt-1">
            Elegí la dirección del movimiento.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DireccionButton
            active={direccion === "ENTRA"}
            onClick={() => handleCambiarDireccion("ENTRA")}
            icon={<TrendingUp className="w-5 h-5" />}
            label="Entra plata"
            tone="green"
          />
          <DireccionButton
            active={direccion === "SALE"}
            onClick={() => handleCambiarDireccion("SALE")}
            icon={<TrendingDown className="w-5 h-5" />}
            label="Sale plata"
            tone="red"
          />
        </div>
      </section>

      {/* Paso 2 · Motivo */}
      <section className="rounded-xl border border-tp-line-soft bg-tp-card p-6 space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Motivo</h2>
          <p className="text-sm text-tp-secondary mt-1">{motivoActual.helper}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="motivo">Elegí el motivo *</Label>
          <Select
            id="motivo"
            required
            value={motivo}
            onChange={(e) => setMotivo(e.target.value as Motivo)}
          >
            {motivosDisponibles.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>

        {esGasto && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-tp-line-soft">
            <div className="space-y-2">
              <Label htmlFor="categoria_id" className="flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-tp-cyan" />
                Categoría del gasto *
              </Label>
              {categoriasGasto.length === 0 ? (
                <div className="rounded-md border border-tp-amber/40 bg-tp-amber/10 px-3 py-2 text-xs text-tp-amber">
                  No hay categorías activas.{" "}
                  <Link href="/configuracion/categorias-gasto" className="underline">
                    Crear una
                  </Link>
                  .
                </div>
              ) : (
                <Select
                  id="categoria_id"
                  required
                  value={categoriaId ?? ""}
                  onChange={(e) => setCategoriaId(Number(e.target.value))}
                >
                  {categoriasGasto.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_gasto">Fecha del gasto *</Label>
              <Input
                id="fecha_gasto"
                type="date"
                required
                value={fechaGasto}
                onChange={(e) => setFechaGasto(e.target.value)}
              />
            </div>
          </div>
        )}
      </section>

      {/* Paso 3 · Detalles */}
      <section className="rounded-xl border border-tp-line-soft bg-tp-card p-6 space-y-5">
        <h2 className="font-display text-lg font-semibold">Detalles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="monto">Monto (ARS) *</Label>
            <MoneyInput
              id="monto"
              min={1}
              required
              value={monto}
              onChange={setMonto}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="metodo_pago">Método de pago *</Label>
            <Select
              id="metodo_pago"
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
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="descripcion">Descripción *</Label>
            <Textarea
              id="descripcion"
              rows={2}
              required
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder={
                esGasto
                  ? "Ej. Cables UTP proveedor XYZ · Factura de luz Junio"
                  : direccion === "ENTRA"
                    ? "Ej. Apertura de caja del día · Devolución de préstamo"
                    : "Ej. Ajuste conteo · Retiro socio"
              }
            />
          </div>
          {esGasto && (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notas">Notas internas</Label>
              <Textarea
                id="notas"
                rows={2}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Solo visible para vos."
              />
            </div>
          )}
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-md border border-tp-red/40 bg-tp-red/10 px-4 py-3 text-sm text-tp-red">
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <Button variant="ghost" asChild disabled={isPending}>
          <Link href="/caja">Cancelar</Link>
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={isPending || (esGasto && categoriasGasto.length === 0)}
        >
          {isPending
            ? "Registrando…"
            : esGasto
              ? "Registrar gasto"
              : "Registrar movimiento"}
        </Button>
      </div>
    </form>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function DireccionButton({
  active,
  onClick,
  icon,
  label,
  tone,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  tone: "green" | "red"
}) {
  const activeCls =
    tone === "green"
      ? "border-tp-green bg-tp-green/10 text-tp-green"
      : "border-tp-red bg-tp-red/10 text-tp-red"
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg border-2 py-4 font-display font-semibold transition-colors",
        active ? activeCls : "border-tp-line-soft text-tp-muted hover:text-tp-text hover:bg-tp-surface-mid/40",
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function motivoAOrigen(m: Motivo): "APERTURA" | "CIERRE" | "AJUSTE" | "OTRO" {
  switch (m) {
    case "APERTURA_CAJA": return "APERTURA"
    case "CIERRE_CAJA":   return "CIERRE"
    case "AJUSTE_MAS":
    case "AJUSTE_MENOS":  return "AJUSTE"
    default:              return "OTRO"
  }
}

function hoyISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}
