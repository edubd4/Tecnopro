import { redirect } from "next/navigation"

// Wave 1.6: /tesoreria absorbido por /contabilidad como pestaña "Por cobrar".
export default function TesoreriaRedirectPage() {
  redirect("/contabilidad?tab=por-cobrar")
}
