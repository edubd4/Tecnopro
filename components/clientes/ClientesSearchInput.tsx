"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

export function ClientesSearchInput() {
  const router = useRouter()
  const params = useSearchParams()
  const [value, setValue] = useState(params.get("q") ?? "")
  const [isPending, startTransition] = useTransition()

  // Debounce: espera 300ms sin cambios y navega con el query
  useEffect(() => {
    const timeout = setTimeout(() => {
      const current = params.get("q") ?? ""
      if (value === current) return
      const sp = new URLSearchParams(params.toString())
      if (value) sp.set("q", value)
      else sp.delete("q")
      startTransition(() => {
        router.replace(`/clientes?${sp.toString()}`)
      })
    }, 300)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tp-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar por nombre, teléfono, DNI, id…"
        className={cn(
          "w-full h-10 rounded-md border border-tp-line bg-tp-input pl-9 pr-9 py-2 text-sm text-tp-text shadow-sm transition-colors",
          "placeholder:text-tp-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tp-cyan/50 focus-visible:border-tp-cyan/40"
        )}
      />
      {isPending && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-tp-muted">
          …
        </span>
      )}
    </div>
  )
}
