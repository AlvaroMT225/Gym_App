"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dumbbell,
  Clock,
  Calendar,
  Play,
  Plus,
  User,
  Trash2,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  currentUser,
  userRoutines,
  coachRoutines,
  workoutSessions,
  machines,
} from "@/lib/mock-data"
import type { Routine, WorkoutSession } from "@/lib/mock-data"

function RoutineCard({ routine }: { routine: Routine }) {
  const router = useRouter()

  const estimatedMin = routine.machines
    .reduce((acc, m) => acc + (m.targetSets * m.restSeconds) / 60, 0)
    .toFixed(0)

  const handleComenzar = () => {
    const firstMachine = routine.machines[0]
    if (firstMachine) {
      router.push(
        `/dashboard/machines/${firstMachine.machineId}?mode=plan&routineId=${routine.id}&step=1`
      )
    }
  }

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
          <Button size="sm" className="gap-1.5 shrink-0" onClick={handleComenzar}>
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
  const [localRoutines, setLocalRoutines] = useState<Routine[]>(userRoutines)
  const [createOpen, setCreateOpen] = useState(false)
  const [newRoutine, setNewRoutine] = useState<{
    name: string
    description: string
    machines: {
      machineId: string
      machineName: string
      targetSets: number
      targetReps: string
      restSeconds: number
      notes: string
    }[]
  }>({
    name: "",
    description: "",
    machines: [],
  })

  const hasCoach =
    currentUser.planType === "COACHING" && currentUser.coachStatus === "ACTIVE"

  const sortedSessions = [...workoutSessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const handleCreateRoutine = () => {
    const created: Routine = {
      id: `routine-${Date.now()}`,
      name: newRoutine.name.trim(),
      description: newRoutine.description.trim(),
      source: "libre",
      machines: newRoutine.machines,
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    }
    setLocalRoutines((prev) => [...prev, created])
    setNewRoutine({ name: "", description: "", machines: [] })
    setCreateOpen(false)
  }

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
                  {localRoutines.map((routine) => (
                    <RoutineCard key={routine.id} routine={routine} />
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4 gap-2"
                  onClick={() => setCreateOpen(true)}
                >
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
                {localRoutines.map((routine) => (
                  <RoutineCard key={routine.id} routine={routine} />
                ))}
              </div>
              <Button
                variant="outline"
                className="w-full mt-4 gap-2"
                onClick={() => setCreateOpen(true)}
              >
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

      {/* Sheet: Crear rutina libre */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Crear rutina libre</SheetTitle>
          </SheetHeader>
          <div className="mt-6 flex flex-col gap-5">

            {/* Nombre */}
            <div className="flex flex-col gap-2">
              <Label>Nombre de la rutina</Label>
              <Input
                placeholder="ej. Tren Superior Fuerza"
                value={newRoutine.name}
                onChange={(e) =>
                  setNewRoutine((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            {/* Descripción */}
            <div className="flex flex-col gap-2">
              <Label>Descripción</Label>
              <Input
                placeholder="ej. Pecho, espalda y hombros"
                value={newRoutine.description}
                onChange={(e) =>
                  setNewRoutine((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>

            <Separator />

            {/* Máquinas agregadas */}
            <div>
              <Label className="mb-2 block">Máquinas ({newRoutine.machines.length})</Label>

              {newRoutine.machines.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Agrega máquinas a tu rutina
                </p>
              )}

              {newRoutine.machines.map((m, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-border"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.machineName}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.targetSets} series × {m.targetReps} reps · {m.restSeconds}s descanso
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setNewRoutine((prev) => ({
                        ...prev,
                        machines: prev.machines.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Agregar máquina — selector */}
            <div className="border border-dashed border-border rounded-lg p-4">
              <Label className="mb-2 block text-xs text-muted-foreground">
                Agregar máquina
              </Label>
              <Select
                onValueChange={(machineId) => {
                  const machine = machines.find((m) => m.id === machineId)
                  if (
                    machine &&
                    !newRoutine.machines.find((m) => m.machineId === machineId)
                  ) {
                    setNewRoutine((prev) => ({
                      ...prev,
                      machines: [
                        ...prev.machines,
                        {
                          machineId: machine.id,
                          machineName: machine.name,
                          targetSets: 3,
                          targetReps: "10-12",
                          restSeconds: 90,
                          notes: "",
                        },
                      ],
                    }))
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar máquina" />
                </SelectTrigger>
                <SelectContent>
                  {machines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} — {m.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Botón crear */}
            <Button
              className="w-full gap-2"
              disabled={!newRoutine.name.trim() || newRoutine.machines.length === 0}
              onClick={handleCreateRoutine}
            >
              <Plus className="w-4 h-4" />
              Crear rutina
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
