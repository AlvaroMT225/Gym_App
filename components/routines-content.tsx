"use client"

import { useStore } from "@/lib/store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dumbbell, User, Calendar, TrendingUp } from "lucide-react"
import type { Routine } from "@/lib/mock-data"

export function RoutinesContent() {
  const { userRoutines, coachRoutines, userCoach } = useStore()
  const allRoutines = [...userRoutines, ...coachRoutines]

  if (allRoutines.length === 0) {
    return (
      <Card className="mt-6">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Dumbbell className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground mb-2">
            No tienes rutinas asignadas
          </p>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {userCoach
              ? "Tu entrenador te asignará una rutina personalizada pronto"
              : "Solicita un entrenador personal para obtener rutinas personalizadas"}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 mt-6">
      {/* Coach Info */}
      {userCoach && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                {userCoach.avatar}
              </div>
              <div>
                <CardTitle className="text-base">Tu Entrenador</CardTitle>
                <CardDescription>{userCoach.name}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Routines List */}
      <div className="grid gap-4">
        {allRoutines.map((routine) => (
          <RoutineCard key={routine.id} routine={routine} />
        ))}
      </div>
    </div>
  )
}

function RoutineCard({ routine }: { routine: Routine }) {
  const isCoachRoutine = routine.source === "entrenador"

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{routine.name}</CardTitle>
              <Badge variant={isCoachRoutine ? "default" : "secondary"}>
                {isCoachRoutine ? (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Entrenador
                  </span>
                ) : (
                  "Personal"
                )}
              </Badge>
            </div>
            <CardDescription>{routine.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Dumbbell className="w-4 h-4" />
              <span>{routine.machines.length} máquinas</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              <span>
                {routine.machines.reduce((acc, m) => acc + m.targetSets, 0)} series totales
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{new Date(routine.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Machines Preview */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Máquinas incluidas:</p>
            <div className="flex flex-wrap gap-2">
              {routine.machines.slice(0, 5).map((machine, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {machine.machineName}
                </Badge>
              ))}
              {routine.machines.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{routine.machines.length - 5} más
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button className="flex-1">Ver Detalles</Button>
            <Button variant="outline">Iniciar Rutina</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
