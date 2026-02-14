"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ScanLine, X, Dumbbell } from "lucide-react"

export function ScanCtaBanner() {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Show after 2 seconds to simulate "entering Home after X hours" or "habitual time"
    const timer = setTimeout(() => {
      setVisible(true)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  if (!visible || dismissed) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-30 lg:bottom-6 lg:left-auto lg:right-6 lg:max-w-sm animate-in slide-in-from-bottom-4 duration-500">
      <div className="relative flex items-center gap-3 bg-primary text-primary-foreground px-4 py-3.5 rounded-xl shadow-lg">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-foreground/15 shrink-0">
          <Dumbbell className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Es hora de entrenar</p>
          <p className="text-xs opacity-80">Escanea tu proxima maquina para comenzar.</p>
        </div>
        <Link
          href="/dashboard/scan"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary-foreground/20 hover:bg-primary-foreground/30 transition-colors text-xs font-semibold shrink-0"
        >
          <ScanLine className="w-4 h-4" />
          Ir
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-card text-muted-foreground hover:text-foreground flex items-center justify-center shadow-md transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
