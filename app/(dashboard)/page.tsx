import { redirect } from "next/navigation"

// La ruta protegida real es /panel. Este archivo existe para que el grupo
// (dashboard) tenga una raíz y cualquier acceso a "/" desde acá redirija.
export default function DashboardRoot() {
  redirect("/panel")
}
