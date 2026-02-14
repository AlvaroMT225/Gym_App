import React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Space_Mono } from "next/font/google"
import { AuthProvider } from "@/lib/auth/auth-context"

import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  title: "Minthy Training - Tu Gym Inteligente",
  description:
    "Registra entrenamientos, trackea tu progreso y desbloquea logros. Escanea el QR de la maquina y entrena mas inteligente.",
}

export const viewport: Viewport = {
  themeColor: "#0d9668",
  width: "device-width",
  initialScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${spaceMono.variable} font-sans antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
