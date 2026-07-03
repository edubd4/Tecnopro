import { redirect } from "next/navigation"

// Wave 1.5: /gastos/nuevo absorbido por /caja/nuevo.
// El form de caja tiene la opción "Gasto (con categoría)" que hace lo mismo
// que hacía este endpoint.
export default function NuevoGastoRedirectPage() {
  redirect("/caja/nuevo")
}
