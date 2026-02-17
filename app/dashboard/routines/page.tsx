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
import {
  currentUser,
  userRoutines,
  coachRoutines,
  workoutSessions,
  machines,
} from "@/lib/mock-data"
import type { Routine, WorkoutSession } from "@/lib/mock-data"

type RoutineMachine = Routine["machines"][number]

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
}: {
  routine: Routine
  onEdit: () => void
}) {
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
        {/* Name + source badge */}
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
  onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  mode: "create" | "edit"
  form: RoutineForm
  setForm: React.Dispatch<React.SetStateAction<RoutineForm>>
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
                const machine = machines.find((m) => m.id === machineId)
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
                {machines.map((m) => (
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
            disabled={!form.name.trim() || form.machines.length === 0}
            onClick={onSubmit}
          >
            {mode === "create" ? (
              <>
                <Plus className="w-4 h-4" />
                Crear rutina
              </>
            ) : (
              <>
                <Pencil className="w-4 h-4" />
                Guardar cambios
              </>
            )}
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
  const [localRoutines, setLocalRoutines] = useState<Routine[]>(userRoutines)
  const [localCoachRoutines, setLocalCoachRoutines] =
    useState<Routine[]>(coachRoutines)

  // Unified Sheet state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create")
  const [form, setForm] = useState<RoutineForm>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)

  const hasCoach =
    currentUser.planType === "COACHING" && currentUser.coachStatus === "ACTIVE"

  const sortedSessions = [...workoutSessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const handleOpenCreate = () => {
    setSheetMode("create")
    setForm(EMPTY_FORM)
    setEditingId(null)
    setSheetOpen(true)
  }

  const handleOpenEdit = (routine: Routine) => {
    setSheetMode("edit")
    setForm({
      name: routine.name,
      description: routine.description,
      machines: routine.machines,
    })
    setEditingId(routine.id)
    setSheetOpen(true)
  }

  const handleSubmit = () => {
    if (sheetMode === "create") {
      const created: Routine = {
        id: `routine-${Date.now()}`,
        name: form.name.trim(),
        description: form.description.trim(),
        source: "libre",
        machines: form.machines,
        createdAt: new Date().toISOString().split("T")[0],
        updatedAt: new Date().toISOString().split("T")[0],
      }
      setLocalRoutines((prev) => [...prev, created])
    } else {
      const updatedFields = {
        name: form.name.trim(),
        description: form.description.trim(),
        machines: form.machines,
        updatedAt: new Date().toISOString().split("T")[0],
      }
      const isCoach = localCoachRoutines.some((r) => r.id === editingId)
      if (isCoach) {
        setLocalCoachRoutines((prev) =>
          prev.map((r) => (r.id === editingId ? { ...r, ...updatedFields } : r))
        )
      } else {
        setLocalRoutines((prev) =>
          prev.map((r) => (r.id === editingId ? { ...r, ...updatedFields } : r))
        )
      }
    }
    setForm(EMPTY_FORM)
    setEditingId(null)
    setSheetOpen(false)
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
                  {localCoachRoutines.map((routine) => (
                    <RoutineCard
                      key={routine.id}
                      routine={routine}
                      onEdit={() => handleOpenEdit(routine)}
                    />
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
                    <RoutineCard
                      key={routine.id}
                      routine={routine}
                      onEdit={() => handleOpenEdit(routine)}
                    />
                  ))}
                </div>
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
              <div className="space-y-3">
                {localRoutines.map((routine) => (
                  <RoutineCard
                    key={routine.id}
                    routine={routine}
                    onEdit={() => handleOpenEdit(routine)}
                  />
                ))}
              </div>
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

      {/* Sheet unificado: Crear / Editar */}
      <RoutineFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={sheetMode}
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
