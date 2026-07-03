import { redirect } from "next/navigation"

// Wave 1.5: /gastos absorbido por /caja.
// Los movimientos categorizados como gasto se registran desde /caja/nuevo
// seleccionando "Gasto (con categoría)".
// Los gastos históricos se ven en el libro de /caja con filtro por origen=GASTO.
export default function GastosRedirectPage() {
  redirect("/caja")
}
