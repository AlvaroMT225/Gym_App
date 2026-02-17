"use client"

import { useState } from "react"
import {
  Dumbbell,
  Clock,
  Calendar,
  Play,
  Plus,
  User,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  currentUser,
  userRoutines,
  coachRoutines,
  workoutSessions,
} from "@/lib/mock-data"
import type { Routine, WorkoutSession } from "@/lib/mock-data"

function RoutineCard({ routine }: { routine: Routine }) {
  const estimatedMin = routine.machines
    .reduce((acc, m) => acc + (m.targetSets * m.restSeconds) / 60, 0)
    .toFixed(0)

  return (
    <Card className="border border-border hover:shadow-md transition-all duration-200">
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {routine.name}
              </h3>
              {routine.source === "entrenador" && (
                <Badge className="bg-primary/10 text-primary border-0 text-xs shrink-0">
                  Coach
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{routine.description}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Dumbbell className="w-3.5 h-3.5" />
                {routine.machines.length} máquinas
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                ~{estimatedMin} min
              </span>
            </div>
          </div>
          <Button size="sm" className="gap-1.5 shrink-0">
            <Play className="w-4 h-4" />
            Comenzar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SessionCard({ session }: { session: WorkoutSession }) {
  const fecha = new Date(session.date).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

  return (
    <Card className="border border-border">
      <CardContent className="py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {session.type === "rutina" ? session.routineName : "Sesión libre"}
              </h3>
              <Badge
                className={`text-xs border-0 shrink-0 ${
                  session.type === "rutina"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {session.type === "rutina" ? "Rutina" : "Libre"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {session.machineCount} máquinas · {session.setCount} sets · {session.duration} min
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">{fecha}</p>
            <p className="text-xs font-medium text-foreground">
              {session.totalVolume.toLocaleString()} kg
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function RoutinesPage() {
  const [activeTab, setActiveTab] = useState("planes")

  const hasCoach =
    currentUser.planType === "COACHING" && currentUser.coachStatus === "ACTIVE"

  const sortedSessions = [...workoutSessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Mi Rutina</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tus planes de entrenamiento e historial de sesiones
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="planes">Planes</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        {/* TAB: Planes */}
        <TabsContent value="planes" className="space-y-4">
          {hasCoach ? (
            <>
              {/* Rutinas del entrenador */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Rutinas del entrenador
                  </h2>
                  <Badge className="bg-primary/10 text-primary border-0 text-xs flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Coach Maria
                  </Badge>
                </div>
                <div className="space-y-3">
                  {coachRoutines.map((routine) => (
                    <RoutineCard key={routine.id} routine={routine} />
                  ))}
                </div>
              </div>

              <Separator className="my-6" />

              {/* Mis rutinas libres */}
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Mis rutinas (libres)
                </h2>
                <div className="space-y-3">
                  {userRoutines.map((routine) => (
                    <RoutineCard key={routine.id} routine={routine} />
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4 gap-2">
                  <Plus className="w-4 h-4" />
                  Crear rutina
                </Button>
              </div>
            </>
          ) : (
            /* Sin entrenador */
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Mis rutinas
              </h2>
              <div className="space-y-3">
                {userRoutines.map((routine) => (
                  <RoutineCard key={routine.id} routine={routine} />
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4 gap-2">
                <Plus className="w-4 h-4" />
                Crear rutina
              </Button>
            </div>
          )}
        </TabsContent>

        {/* TAB: Historial */}
        <TabsContent value="historial">
          {sortedSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                Sin sesiones registradas
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Tus entrenamientos aparecerán aquí
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
