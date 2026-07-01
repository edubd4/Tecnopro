import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  CalendarDays,
  FileText,
  BookOpen,
  Package,
  Wallet,
  Receipt,
  Landmark,
  Calculator,
  BarChart3,
  UserCog,
  Settings,
} from "lucide-react"
import { ROL, type Rol } from "@/lib/constants"

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  // Roles que pueden ver este item. Si no se define, cualquier rol autenticado.
  roles?: Rol[]
}

export type NavGroup = {
  label: string
  items: NavItem[]
}

// Configuración del sidebar. Cambiar acá impacta en el layout de todo el panel.
export const NAV: NavGroup[] = [
  {
    label: "Operación",
    items: [
      { label: "Panel",     href: "/panel",       icon: LayoutDashboard },
      { label: "Órdenes",   href: "/ordenes",     icon: ClipboardList },
      { label: "Turnos",    href: "/turnos",      icon: CalendarDays },
      { label: "Clientes",  href: "/clientes",    icon: Users },
    ],
  },
  {
    label: "Comercial",
    items: [
      { label: "Presupuestos", href: "/presupuestos", icon: FileText },
      { label: "Catálogo",     href: "/catalogo",     icon: BookOpen },
      { label: "Stock",        href: "/stock",        icon: Package },
    ],
  },
  {
    label: "Plata",
    items: [
      { label: "Caja",         href: "/caja",         icon: Wallet,   roles: [ROL.ADMIN] },
      { label: "Gastos",       href: "/gastos",       icon: Receipt,  roles: [ROL.ADMIN] },
      { label: "Tesorería",    href: "/tesoreria",    icon: Landmark, roles: [ROL.ADMIN] },
      { label: "Contabilidad", href: "/contabilidad", icon: Calculator, roles: [ROL.ADMIN] },
    ],
  },
  {
    label: "Análisis",
    items: [
      { label: "Analytics", href: "/analytics", icon: BarChart3, roles: [ROL.ADMIN] },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "Usuarios",       href: "/usuarios",     icon: UserCog,  roles: [ROL.ADMIN] },
      { label: "Configuración",  href: "/configuracion", icon: Settings, roles: [ROL.ADMIN] },
    ],
  },
]

export function filterNavByRol(nav: NavGroup[], rol: Rol | undefined): NavGroup[] {
  return nav
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || (rol && item.roles.includes(rol))),
    }))
    .filter((group) => group.items.length > 0)
}
