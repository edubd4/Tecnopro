"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { NavGroup } from "@/lib/nav"
import { ICONS } from "./icons"

type SidebarProps = {
  groups: NavGroup[]
  onNavigate?: () => void  // se llama al clickear un item (para cerrar en mobile)
  className?: string
}

export function Sidebar({ groups, onNavigate, className }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "flex flex-col h-full w-64 bg-tp-surface-low border-r border-tp-line-soft",
        className
      )}
    >
      <Link
        href="/panel"
        onClick={onNavigate}
        className="flex items-center gap-3 px-5 h-16 border-b border-tp-line-soft shrink-0"
      >
        <div className="w-9 h-9 rounded-lg bg-tp-grad flex items-center justify-center font-display font-bold text-tp-bg">
          T
        </div>
        <div>
          <p className="font-display font-bold text-sm tracking-wider leading-none">
            TECNOPRO
          </p>
          <p className="font-mono text-[9.5px] text-tp-muted tracking-[0.14em] mt-1">
            PANEL OPERATIVO
          </p>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 font-mono text-[10px] text-tp-muted tracking-[0.16em] uppercase font-semibold">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = ICONS[item.iconKey]
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                        isActive
                          ? "bg-tp-cyan/10 text-tp-text border-l-2 border-tp-cyan pl-[10px]"
                          : "text-tp-secondary hover:bg-tp-surface-mid hover:text-tp-text"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}

type MobileCloseProps = {
  onClose: () => void
}
export function SidebarMobileClose({ onClose }: MobileCloseProps) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="absolute top-3 right-3 p-2 rounded-md text-tp-muted hover:text-tp-text hover:bg-tp-surface-mid"
      aria-label="Cerrar navegación"
    >
      <X className="w-5 h-5" />
    </button>
  )
}
