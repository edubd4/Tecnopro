import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TECNOPRO — Panel Operativo',
  description: 'Sistema de gestión integral para servicio técnico',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es-AR" suppressHydrationWarning>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  )
}
