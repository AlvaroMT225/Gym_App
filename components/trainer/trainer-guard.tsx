"use client"

import { ShieldAlert } from "lucide-react"
import { useAuth } from "@/lib/auth/auth-context"
import { Card, CardContent } from "@/components/ui/card"

export function TrainerGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="px-4 py-10 lg:px-8">
        <p className="text-sm text-muted-foreground">Cargando acceso...</p>
      </div>
    )
  }

  if (!user || (user.role !== "TRAINER" && user.role !== "ADMIN")) {
    return (
      <div className="px-4 py-10 lg:px-8">
        <Card className="border border-dashed border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-destructive/10 mb-4">
              <ShieldAlert className="w-7 h-7 text-destructive" />
            </div>
            <h1 className="text-xl font-bold text-foreground">403 Acceso denegado</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              Esta seccion es exclusiva para entrenadores y administradores.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}

