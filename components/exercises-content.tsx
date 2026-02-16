"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Search,
  ScanLine,
  Dumbbell,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  exerciseCatalog,
  type ExerciseItem,
  type MuscleGroup,
} from "@/lib/exercise-catalog"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"

type OrderType = "a-z" | "z-a"
type EquipmentFilter = "all" | "maquina-qr" | "maquina-sin-qr" | "peso-libre" | "polea-qr"

const muscleGroups: MuscleGroup[] = [
  "Pecho",
  "Espalda",
  "Hombros",
  "Biceps",
  "Cuadriceps",
  "Femorales",
  "Gluteos",
  "Abductores",
  "Core",
]

export function ExercisesContent() {
  const router = useRouter()
  const { addSession } = useStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null)
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentFilter>("all")
  const [order, setOrder] = useState<OrderType>("a-z")
  const [activeTab, setActiveTab] = useState<"upper" | "lower">("upper")

  // Modal de registro manual
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<ExerciseItem | null>(null)

  // Filtrado y ordenamiento
  const filteredExercises = useMemo(() => {
    let result = [...exerciseCatalog]

    // Buscar por nombre o código
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (ex) =>
          ex.name.toLowerCase().includes(q) ||
          ex.code.toLowerCase().includes(q) ||
          ex.primaryMuscle.toLowerCase().includes(q) ||
          ex.secondaryMuscles.some((m) => m.toLowerCase().includes(q))
      )
    }

    // Filtrar por grupo muscular
    if (selectedMuscle) {
      result = result.filter(
        (ex) =>
          ex.primaryMuscle === selectedMuscle ||
          ex.secondaryMuscles.includes(selectedMuscle)
      )
    }

    // Filtrar por equipo
    if (equipmentFilter !== "all") {
      if (equipmentFilter === "maquina-qr") {
        result = result.filter((ex) => ex.equipment === "Maquina" && ex.qrEnabled)
      } else if (equipmentFilter === "maquina-sin-qr") {
        result = result.filter((ex) => ex.equipment === "Maquina" && !ex.qrEnabled)
      } else if (equipmentFilter === "peso-libre") {
        result = result.filter((ex) => ex.equipment === "Peso libre")
      } else if (equipmentFilter === "polea-qr") {
        result = result.filter((ex) => ex.equipment === "Polea" && ex.qrEnabled)
      }
    }

    // Ordenar
    result.sort((a, b) => {
      if (order === "a-z") return a.name.localeCompare(b.name)
      return b.name.localeCompare(a.name)
    })

    return result
  }, [searchQuery, selectedMuscle, equipmentFilter, order])

  // Función para abrir scanner QR
  const handleScanQR = () => {
    router.push("/dashboard/scan")
  }

  // Función para registrar ejercicio
  const handleRegister = (exercise: ExerciseItem) => {
    if (exercise.qrEnabled) {
      // Abrir scanner
      router.push("/dashboard/scan")
    } else {
      // Abrir modal de registro manual
      setSelectedExercise(exercise)
      setManualModalOpen(true)
    }
  }

  // Renderizar ejercicios por región y categorías
  const renderExercisesByRegion = (region: "upper" | "lower") => {
    const exercises = filteredExercises.filter((ex) => ex.region.includes(region))

    if (region === "upper") {
      // Tren superior: Multifuncional, Espalda, Pecho, Hombros, Brazos
      const sections = [
        { title: "Multifuncional", items: exercises.filter((ex) => ex.isMultifunctional) },
        { title: "Espalda", items: exercises.filter((ex) => ex.category === "Espalda") },
        { title: "Pecho", items: exercises.filter((ex) => ex.category === "Pecho") },
        { title: "Hombros", items: exercises.filter((ex) => ex.category === "Hombros") },
      ]

      // Para Brazos: contar ejercicios donde Bíceps/Tríceps son secundarios
      const bicepsTricepsCount = exercises.filter(
        (ex) =>
          ex.secondaryMuscles.includes("Biceps") || ex.secondaryMuscles.includes("Triceps")
      ).length

      return (
        <div className="flex flex-col gap-6">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {section.title}
              </h3>
              {section.items.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {section.items.map((ex) => (
                    <ExerciseCard key={ex.id} exercise={ex} onRegister={handleRegister} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4">
                  Aún no tienes ejercicios de {section.title} registrados.
                </p>
              )}
            </div>
          ))}

          {/* Brazos (Bíceps / Tríceps) */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Brazos (Bíceps / Tríceps)
            </h3>
            {bicepsTricepsCount > 0 ? (
              <p className="text-sm text-foreground/70 py-4">
                Ejercicios con Bíceps o Tríceps como músculo secundario:{" "}
                <span className="font-semibold text-primary">{bicepsTricepsCount}</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                Aún no tienes ejercicios de Brazos registrados.
              </p>
            )}
          </div>
        </div>
      )
    } else {
      // Inferior + Core: Multifuncional, Cuádriceps, Isquios, Glúteos/Abductores, Core
      const sections = [
        {
          title: "Multifuncional",
          items: exercises.filter((ex) => ex.isMultifunctional),
        },
        {
          title: "Cuádriceps",
          items: exercises.filter((ex) => ex.category === "Cuadriceps"),
        },
        {
          title: "Isquios / Femorales",
          items: exercises.filter((ex) => ex.category === "Isquios / Femorales"),
        },
        {
          title: "Glúteos / Abductores",
          items: exercises.filter((ex) => ex.category === "Gluteos / Abductores"),
        },
        {
          title: "Core / Abdomen",
          items: exercises.filter((ex) => ex.primaryMuscle === "Core"),
        },
      ]

      return (
        <div className="flex flex-col gap-6">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {section.title}
              </h3>
              {section.items.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {section.items.map((ex) => (
                    <ExerciseCard key={ex.id} exercise={ex} onRegister={handleRegister} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4">
                  Aún no tienes ejercicios de {section.title} registrados.
                </p>
              )}
            </div>
          ))}
        </div>
      )
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Ejercicios</h1>
          <Button onClick={handleScanQR} className="gap-2">
            <ScanLine className="w-4 h-4" />
            Escanear QR
          </Button>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar ejercicio o máquina..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3">
        {/* Chips de grupo muscular */}
        <div className="flex flex-wrap gap-2">
          {muscleGroups.map((muscle) => (
            <button
              key={muscle}
              type="button"
              onClick={() => setSelectedMuscle(selectedMuscle === muscle ? null : muscle)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                selectedMuscle === muscle
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {muscle}
            </button>
          ))}
        </div>

        {/* Dropdown equipo + Orden */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              value={equipmentFilter}
              onChange={(e) => setEquipmentFilter(e.target.value as EquipmentFilter)}
              className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-input bg-card text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              <option value="all">Todos los equipos</option>
              <option value="maquina-qr">Máquina (QR)</option>
              <option value="maquina-sin-qr">Máquina (sin QR)</option>
              <option value="peso-libre">Peso libre (Manual)</option>
              <option value="polea-qr">Polea (QR)</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value as OrderType)}
              className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-input bg-card text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              <option value="a-z">A→Z</option>
              <option value="z-a">Z→A</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upper" | "lower")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upper">Tren superior</TabsTrigger>
          <TabsTrigger value="lower">Inferior + Core</TabsTrigger>
        </TabsList>

        <TabsContent value="upper" className="mt-6">
          {renderExercisesByRegion("upper")}
        </TabsContent>

        <TabsContent value="lower" className="mt-6">
          {renderExercisesByRegion("lower")}
        </TabsContent>
      </Tabs>

      {/* Modal de registro manual (placeholder por ahora) */}
      {manualModalOpen && selectedExercise && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm"
          onClick={() => setManualModalOpen(false)}
        >
          <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Registro manual</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Registrando: <span className="font-semibold text-foreground">{selectedExercise.name}</span>
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Esta funcionalidad redirige al flujo de registro manual existente.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setManualModalOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    setManualModalOpen(false)
                    router.push("/dashboard/manual")
                  }}
                  className="flex-1"
                >
                  Ir a registro manual
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// ── ExerciseCard Component ────────────────────────────────
interface ExerciseCardProps {
  exercise: ExerciseItem
  onRegister: (exercise: ExerciseItem) => void
}

function ExerciseCard({ exercise, onRegister }: ExerciseCardProps) {
  return (
    <Card className="border border-border hover:border-primary/40 hover:shadow-md transition-all duration-200">
      <CardContent className="pt-6">
        <div className="flex flex-col gap-3">
          {/* Código */}
          <Badge variant="secondary" className="w-fit text-xs font-mono">
            {exercise.code}
          </Badge>

          {/* Nombre */}
          <h4 className="text-base font-semibold text-foreground">{exercise.name}</h4>

          {/* Chips de músculos */}
          <div className="flex flex-wrap gap-1.5">
            <Badge className="text-xs bg-primary/10 text-primary border-0 font-medium">
              {exercise.primaryMuscle}
            </Badge>
            {exercise.secondaryMuscles.map((muscle) => (
              <Badge
                key={muscle}
                variant="outline"
                className="text-xs text-muted-foreground border-muted-foreground/30"
              >
                {muscle}
              </Badge>
            ))}
          </div>

          {/* Equipo + modo */}
          <p className="text-xs text-muted-foreground">
            {exercise.equipment} • {exercise.qrEnabled ? "QR" : "Manual"}
          </p>

          {/* Badge de escaneo */}
          {exercise.qrEnabled ? (
            <div className="flex items-center gap-1.5 text-xs text-primary">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="font-medium">Escaneable (QR)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="font-medium">Manual (sin QR) • no cuenta para ranking</span>
            </div>
          )}

          {/* Botón Registrar */}
          <Button
            onClick={() => onRegister(exercise)}
            size="sm"
            className="w-full mt-2"
            variant={exercise.qrEnabled ? "default" : "outline"}
          >
            <Dumbbell className="w-4 h-4 mr-2" />
            Registrar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
