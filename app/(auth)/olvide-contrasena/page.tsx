import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { OlvideContrasenaForm } from "./OlvideContrasenaForm"

export const metadata = {
  title: "Recuperar contraseña — TECNOPRO",
}

export default function OlvideContrasenaPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-tp-bg tp-circuit px-6">
      <div className="w-full max-w-sm space-y-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-tp-muted hover:text-tp-text"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al login
        </Link>

        <div>
          <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase">
            Recuperar acceso
          </p>
          <h1 className="font-display text-3xl font-bold mt-1">
            Olvidé mi contraseña
          </h1>
          <p className="text-tp-secondary text-sm mt-2">
            Ingresá tu email y te mandamos un link para reiniciar tu contraseña.
          </p>
        </div>

        <OlvideContrasenaForm />
      </div>
    </main>
  )
}
