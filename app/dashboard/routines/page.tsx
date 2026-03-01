"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dumbbell,
  Clock,
  Calendar,
  Play,
  Plus,
  User,
  Trash2,
  Pencil,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface RoutineItem {
  id: string
  orderIndex: number
  exerciseId: string
  exerciseName: string | null
  muscleGroups: string[] | null
  machineId: string | null
  setsTarget: number
  repsTarget: number
  weightTarget: number | null
  restSeconds: number
  notes: string | null
}

interface RoutineDto {
  id: string
  name: string
  description: string | null
  isActive: boolean
  daysPerWeek: number
  difficultyLevel: number
  updatedAt: string
  items: RoutineItem[]
}

interface RoutinesResponse {
  routines: RoutineDto[]
  activeRoutineId: string | null
}

interface WorkoutSessionSummary {
  id: string
  routine_id: string | null
  started_at: string
  ended_at: string | null
  duration_minutes: number | null
  total_volume_kg: number
  total_sets: number
  total_reps: number
  status: string
  session_type: string
}

interface WorkoutSessionsResponse {
  sessions: WorkoutSessionSummary[]
}

interface RoutineMachine {
  machineId: string | null
  machineName: string
  targetSets: number
  targetReps: string
  restSeconds: number
  notes: string
}

interface Routine {
  id: string
  name: string
  description: string
  source: "libre" | "entrenador"
  machines: RoutineMachine[]
  updatedAt: string
}

interface WorkoutSession {
  id: string
  date: string
  type: "rutina" | "libre"
  routineName?: string
  machineCount: number
  setCount: number
  duration: number
  totalVolume: number
}

interface MachineOption {
  id: string
  name: string
  category: string
}

type RoutineForm = {
  name: string
  description: string
  machines: RoutineMachine[]
}

const EMPTY_FORM: RoutineForm = { name: "", description: "", machines: [] }

// ─────────────────────────────────────────────────────────────
// RoutineCard
// ─────────────────────────────────────────────────────────────
function RoutineCard({
  routine,
  onEdit,
  isActive,
}: {
  routine: Routine
  onEdit: () => void
  isActive: boolean
}) {
  const router = useRouter()

  const estimatedMin = routine.machines
    .reduce((acc, m) => acc + (m.targetSets * m.restSeconds) / 60, 0)
    .toFixed(0)

  const handleComenzar = () => {
    const firstMachine = routine.machines[0]
    if (firstMachine?.machineId) {
      router.push(
        `/dashboard/machines/${firstMachine.machineId}?mode=plan&routineId=${routine.id}&step=1`
      )
      return
    }
    window.alert("Este ejercicio no está asociado a una máquina")
  }

  return (
    <Card className="border border-border hover:shadow-md transition-all duration-200">
      <CardContent className="py-4">
        {/* Name + source badge */}
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {routine.name}
          </h3>
          {isActive && (
            <Badge className="bg-primary/10 text-primary border-0 text-xs shrink-0">
              Activa
            </Badge>
          )}
          {routine.source === "entrenador" && (
            <Badge className="bg-primary/10 text-primary border-0 text-xs shrink-0">
              Coach
            </Badge>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground">{routine.description}</p>

        {/* Stats row */}
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

        {/* Ordered machines list */}
        <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
          {routine.machines.map((m, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-4 h-4 flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium shrink-0 text-[10px]">
                {i + 1}
              </span>
              <span className="flex-1 text-foreground truncate">{m.machineName}</span>
              <span className="text-muted-foreground shrink-0">
                {m.targetSets}×{m.targetReps}
              </span>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={onEdit}
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleComenzar}>
            <Play className="w-4 h-4" />
            Comenzar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
// SessionCard
// ─────────────────────────────────────────────────────────────
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
              {session.machineCount} máquinas · {session.setCount} sets ·{" "}
              {session.duration} min
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

// ─────────────────────────────────────────────────────────────
// RoutineFormSheet — reutilizado para crear y editar
// ─────────────────────────────────────────────────────────────
function RoutineFormSheet({
  open,
  onOpenChange,
  mode,
  form,
  setForm,
  machineOptions,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  mode: "create" | "edit"
  form: RoutineForm
  setForm: React.Dispatch<React.SetStateAction<RoutineForm>>
  machineOptions: MachineOption[]
  onSubmit: () => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {mode === "create" ? "Crear rutina libre" : "Editar rutina"}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 flex flex-col gap-5">
          {/* Nombre */}
          <div className="flex flex-col gap-2">
            <Label>Nombre de la rutina</Label>
            <Input
              placeholder="ej. Tren Superior Fuerza"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>

          {/* Descripción */}
          <div className="flex flex-col gap-2">
            <Label>Descripción</Label>
            <Input
              placeholder="ej. Pecho, espalda y hombros"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          </div>

          <Separator />

          {/* Máquinas en orden */}
          <div>
            <Label className="mb-2 block">
              Máquinas ({form.machines.length})
            </Label>

            {form.machines.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Agrega máquinas a tu rutina
              </p>
            )}

            {form.machines.map((m, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-border"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium text-[10px] shrink-0">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {m.machineName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.targetSets} series × {m.targetReps} reps ·{" "}
                      {m.restSeconds}s descanso
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setForm((prev) => ({
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

          {/* Agregar máquina */}
          <div className="border border-dashed border-border rounded-lg p-4">
            <Label className="mb-2 block text-xs text-muted-foreground">
              Agregar máquina
            </Label>
            <Select
              onValueChange={(machineId) => {
                const machine = machineOptions.find((m) => m.id === machineId)
                if (
                  machine &&
                  !form.machines.find((m) => m.machineId === machineId)
                ) {
                  setForm((prev) => ({
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
                {machineOptions.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} — {m.category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Submit */}
          <Button
            className="w-full gap-2"
            disabled
            onClick={onSubmit}
          >
            Disponible pronto
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
export default function RoutinesPage() {
  const [activeTab, setActiveTab] = useState("planes")
  const [localRoutines, setLocalRoutines] = useState<Routine[]>([])
  const [localCoachRoutines, setLocalCoachRoutines] =
    useState<Routine[]>([])
  const [sortedSessions, setSortedSessions] = useState<WorkoutSession[]>([])
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Unified Sheet state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create")
  const [form, setForm] = useState<RoutineForm>(EMPTY_FORM)

  const hasCoach = localCoachRoutines.length > 0

  const machineOptions = useMemo<MachineOption[]>(() => {
    const machineMap = new Map<string, MachineOption>()
    const allRoutines = [...localCoachRoutines, ...localRoutines]
    for (const routine of allRoutines) {
      for (const item of routine.machines) {
        if (!item.machineId || machineMap.has(item.machineId)) continue
        machineMap.set(item.machineId, {
          id: item.machineId,
          name: item.machineName,
          category: "Ejercicio",
        })
      }
    }
    return Array.from(machineMap.values())
  }, [localCoachRoutines, localRoutines])

  useEffect(() => {
    const controller = new AbortController()

    const loadRoutineData = async () => {
      setLoadingData(true)
      setLoadError(null)

      try {
        const [routinesResponseRaw, sessionsResponseRaw] = await Promise.all([
          fetch("/api/client/routines", {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch("/api/client/workout-sessions/recent", {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }),
        ])

        if (!routinesResponseRaw.ok || !sessionsResponseRaw.ok) {
          throw new Error("routine_data_fetch_failed")
        }

        const routinesResponse = (await routinesResponseRaw.json()) as RoutinesResponse
        const sessionsResponse = (await sessionsResponseRaw.json()) as WorkoutSessionsResponse

        const mappedRoutines: Routine[] = routinesResponse.routines.map((routine) => ({
          id: routine.id,
          name: routine.name,
          description: routine.description ?? "",
          source: "libre",
          machines: routine.items.map((item) => ({
            machineId: item.machineId ?? null,
            machineName: item.exerciseName ?? "Ejercicio",
            targetSets: item.setsTarget,
            targetReps: String(item.repsTarget),
            restSeconds: item.restSeconds,
            notes: item.notes ?? "",
          })),
          updatedAt: routine.updatedAt,
        }))

        const routineNameById = new Map<string, string>(
          mappedRoutines.map((routine) => [routine.id, routine.name])
        )
        const mappedSessions: WorkoutSession[] = sessionsResponse.sessions.map((session) => ({
          id: session.id,
          date: session.started_at,
          type: session.routine_id ? "rutina" : "libre",
          routineName: session.routine_id ? (routineNameById.get(session.routine_id) ?? "Rutina") : undefined,
          machineCount: 0,
          setCount: session.total_sets,
          duration: session.duration_minutes ?? 0,
          totalVolume: session.total_volume_kg,
        }))

        if (!controller.signal.aborted) {
          setLocalRoutines(mappedRoutines)
          setLocalCoachRoutines([])
          setActiveRoutineId(routinesResponse.activeRoutineId ?? null)
          setSortedSessions(mappedSessions)
        }
      } catch {
        if (controller.signal.aborted) return
        setLocalRoutines([])
        setLocalCoachRoutines([])
        setActiveRoutineId(null)
        setSortedSessions([])
        setLoadError("No fue posible cargar tu rutina")
      } finally {
        if (!controller.signal.aborted) {
          setLoadingData(false)
        }
      }
    }

    void loadRoutineData()
    return () => controller.abort()
  }, [])

  const handleOpenCreate = () => {
    setSheetMode("create")
    setForm(EMPTY_FORM)
    setSheetOpen(true)
  }

  const handleOpenEdit = (routine: Routine) => {
    setSheetMode("edit")
    setForm({
      name: routine.name,
      description: routine.description,
      machines: routine.machines,
    })
    setSheetOpen(true)
  }

  const handleSubmit = () => {}

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
          {loadingData ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-muted-foreground">Cargando tu rutina...</p>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                No fue posible cargar tu rutina
              </p>
            </div>
          ) : hasCoach ? (
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
                  {localCoachRoutines.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin rutina aún</p>
                  ) : (
                    localCoachRoutines.map((routine) => (
                      <RoutineCard
                        key={routine.id}
                        routine={routine}
                        isActive={routine.id === activeRoutineId}
                        onEdit={() => handleOpenEdit(routine)}
                      />
                    ))
                  )}
                </div>
              </div>

              <Separator className="my-6" />

              {/* Mis rutinas libres */}
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Mis rutinas (libres)
                </h2>
                {localRoutines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin rutina aún</p>
                ) : (
                  <div className="space-y-3">
                    {localRoutines.map((routine) => (
                      <RoutineCard
                        key={routine.id}
                        routine={routine}
                        isActive={routine.id === activeRoutineId}
                        onEdit={() => handleOpenEdit(routine)}
                      />
                    ))}
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full mt-4 gap-2"
                  onClick={handleOpenCreate}
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
              {localRoutines.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin rutina aún</p>
              ) : (
                <div className="space-y-3">
                  {localRoutines.map((routine) => (
                    <RoutineCard
                      key={routine.id}
                      routine={routine}
                      isActive={routine.id === activeRoutineId}
                      onEdit={() => handleOpenEdit(routine)}
                    />
                  ))}
                </div>
              )}
              <Button
                variant="outline"
                className="w-full mt-4 gap-2"
                onClick={handleOpenCreate}
              >
                <Plus className="w-4 h-4" />
                Crear rutina
              </Button>
            </div>
          )}
        </TabsContent>

        {/* TAB: Historial */}
        <TabsContent value="historial">
          {loadingData ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-muted-foreground">Cargando historial...</p>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                No fue posible cargar tu rutina
              </p>
            </div>
          ) : sortedSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                Sin sesiones recientes
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

      {/* Sheet unificado: Crear / Editar */}
      <RoutineFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={sheetMode}
        form={form}
        setForm={setForm}
        machineOptions={machineOptions}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
