import { ROL, type Rol } from "@/lib/constants"

// Las claves de iconos deben existir en `components/nav/icons.ts`.
// Se usa string en vez de un componente React porque el nav se define en el
// server component (layout) y se pasa como prop a un client component; las
// funciones/componentes no son JSON-serializables cruzando la frontera.
export type IconKey =
  | "LayoutDashboard"
  | "ClipboardList"
  | "Users"
  | "CalendarDays"
  | "FileText"
  | "BookOpen"
  | "Package"
  | "Wallet"
  | "Receipt"
  | "Landmark"
  | "Calculator"
  | "BarChart3"
  | "UserCog"
  | "Settings"
  | "AlertTriangle"
  | "ScrollText"

export type NavItem = {
  label: string
  href: string
  iconKey: IconKey
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
      { label: "Panel",     href: "/panel",       iconKey: "LayoutDashboard" },
      { label: "Órdenes",   href: "/ordenes",     iconKey: "ClipboardList" },
      { label: "Turnos",    href: "/turnos",      iconKey: "CalendarDays" },
      { label: "Clientes",  href: "/clientes",    iconKey: "Users" },
    ],
  },
  {
    label: "Comercial",
    items: [
      { label: "Presupuestos", href: "/presupuestos", iconKey: "FileText" },
      { label: "Catálogo",     href: "/catalogo",     iconKey: "BookOpen" },
      { label: "Stock",        href: "/stock",        iconKey: "Package" },
    ],
  },
  {
    label: "Plata",
    items: [
      { label: "Caja",         href: "/caja",         iconKey: "Wallet",     roles: [ROL.ADMIN] },
      { label: "Contabilidad", href: "/contabilidad", iconKey: "Calculator", roles: [ROL.ADMIN] },
    ],
  },
  {
    label: "Análisis",
    items: [
      { label: "Analytics", href: "/analytics", iconKey: "BarChart3",    roles: [ROL.ADMIN] },
      { label: "Alertas",   href: "/alertas",   iconKey: "AlertTriangle", roles: [ROL.ADMIN] },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "Usuarios",       href: "/usuarios",     iconKey: "UserCog",    roles: [ROL.ADMIN] },
      { label: "Historial",      href: "/historial",    iconKey: "ScrollText", roles: [ROL.ADMIN] },
      { label: "Configuración",  href: "/configuracion", iconKey: "Settings",  roles: [ROL.ADMIN] },
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
