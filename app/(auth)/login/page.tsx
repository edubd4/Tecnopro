export default function LoginPage() {
  return (
    <main className="tp-circuit min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-tp-card border border-tp-line-soft rounded-xl p-8 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="font-display text-2xl font-bold">Iniciar sesión</h1>
          <p className="text-sm text-tp-muted">
            Panel TECNOPRO — acceso solo personal autorizado
          </p>
        </div>

        {/* TODO Fase 1.2: form de login con Supabase Auth */}
        <div className="text-center text-sm text-tp-muted font-mono">
          [ Form de login — pendiente Fase 1.2 ]
        </div>
      </div>
    </main>
  )
}
