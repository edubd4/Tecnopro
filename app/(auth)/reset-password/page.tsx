import { ResetPasswordForm } from "./ResetPasswordForm"

export const metadata = {
  title: "Nueva contraseña — TECNOPRO",
}

// El link del email de Supabase apunta acá con un token en el hash.
// El client component se encarga de detectar la sesión y permitir cambiar la contraseña.
export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-tp-bg tp-circuit px-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase">
            Reiniciar acceso
          </p>
          <h1 className="font-display text-3xl font-bold mt-1">
            Nueva contraseña
          </h1>
          <p className="text-tp-secondary text-sm mt-2">
            Elegí una contraseña nueva de al menos 6 caracteres.
          </p>
        </div>

        <ResetPasswordForm />
      </div>
    </main>
  )
}
