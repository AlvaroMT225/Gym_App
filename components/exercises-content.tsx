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
    // IMPORTANTE: Usar catálogo completo para secciones, no el filtrado
    // Los filtros solo afectan a qué ejercicios se DESTACAN, no a cuáles se MUESTRAN
    const allExercisesInRegion = exerciseCatalog.filter((ex) => ex.region.includes(region))

    // Aplicar filtros para destacar
    const matchesFilters = (ex: ExerciseItem) => {
      // Si no hay filtros, todos coinciden
      if (!searchQuery && !selectedMuscle && equipmentFilter === "all") return true

      // Filtro de búsqueda
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesSearch =
          ex.name.toLowerCase().includes(q) ||
          ex.code.toLowerCase().includes(q) ||
          ex.primaryMuscle.toLowerCase().includes(q) ||
          ex.secondaryMuscles.some((m) => m.toLowerCase().includes(q))
        if (!matchesSearch) return false
      }

      // Filtro de músculo
      if (selectedMuscle) {
        const matchesMuscle =
          ex.primaryMuscle === selectedMuscle || ex.secondaryMuscles.includes(selectedMuscle)
        if (!matchesMuscle) return false
      }

      // Filtro de equipo
      if (equipmentFilter !== "all") {
        if (equipmentFilter === "maquina-qr" && !(ex.equipment === "Maquina" && ex.qrEnabled)) return false
        if (equipmentFilter === "maquina-sin-qr" && !(ex.equipment === "Maquina" && !ex.qrEnabled)) return false
        if (equipmentFilter === "peso-libre" && ex.equipment !== "Peso libre") return false
        if (equipmentFilter === "polea-qr" && !(ex.equipment === "Polea" && ex.qrEnabled)) return false
      }

      return true
    }

    if (region === "upper") {
      // Tren superior: Multifuncional, Espalda, Pecho, Hombros, Brazos
      const sections = [
        { title: "Multifuncional", items: allExercisesInRegion.filter((ex) => ex.isMultifunctional) },
        { title: "Espalda", items: allExercisesInRegion.filter((ex) => ex.category === "Espalda") },
        { title: "Pecho", items: allExercisesInRegion.filter((ex) => ex.category === "Pecho") },
        { title: "Hombros", items: allExercisesInRegion.filter((ex) => ex.category === "Hombros") },
      ]

      // Para Brazos: contar ejercicios donde Bíceps/Tríceps son secundarios
      const bicepsTricepsItems = allExercisesInRegion.filter(
        (ex) =>
          ex.secondaryMuscles.includes("Biceps") || ex.secondaryMuscles.includes("Triceps")
      )

      return (
        <div className="flex flex-col gap-8">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 px-1">
                {section.title}
              </h3>
              {section.items.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {section.items.map((ex) => {
                    const isHighlighted = matchesFilters(ex)
                    return (
                      <ExerciseCard
                        key={ex.id}
                        exercise={ex}
                        onRegister={handleRegister}
                        dimmed={!isHighlighted && (!!searchQuery || !!selectedMuscle || equipmentFilter !== "all")}
                      />
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-muted bg-muted/20 p-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    Aún no tienes ejercicios de {section.title} registrados.
                  </p>
                </div>
              )}
            </div>
          ))}

          {/* Brazos (Bíceps / Tríceps) */}
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 px-1">
              Brazos (Bíceps / Tríceps)
            </h3>
            {bicepsTricepsItems.length > 0 ? (
              <div className="rounded-lg border border-border bg-card p-6">
                <p className="text-sm text-foreground">
                  Ejercicios con Bíceps o Tríceps como músculo secundario:{" "}
                  <span className="font-bold text-primary text-base">{bicepsTricepsItems.length}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Usa los filtros de músculo arriba para ver estos ejercicios.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-muted bg-muted/20 p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Aún no tienes ejercicios de Brazos registrados.
                </p>
              </div>
            )}
          </div>
        </div>
      )
    } else {
      // Inferior + Core: Multifuncional, Cuádriceps, Isquios, Glúteos/Abductores, Core
      const sections = [
        {
          title: "Multifuncional",
          items: allExercisesInRegion.filter((ex) => ex.isMultifunctional),
        },
        {
          title: "Cuádriceps",
          items: allExercisesInRegion.filter((ex) => ex.category === "Cuadriceps"),
        },
        {
          title: "Isquios / Femorales",
          items: allExercisesInRegion.filter((ex) => ex.category === "Isquios / Femorales"),
        },
        {
          title: "Glúteos / Abductores",
          items: allExercisesInRegion.filter((ex) => ex.category === "Gluteos / Abductores"),
        },
        {
          title: "Core / Abdomen",
          items: allExercisesInRegion.filter((ex) => ex.primaryMuscle === "Core"),
        },
      ]

      return (
        <div className="flex flex-col gap-8">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 px-1">
                {section.title}
              </h3>
              {section.items.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {section.items.map((ex) => {
                    const isHighlighted = matchesFilters(ex)
                    return (
                      <ExerciseCard
                        key={ex.id}
                        exercise={ex}
                        onRegister={handleRegister}
                        dimmed={!isHighlighted && (!!searchQuery || !!selectedMuscle || equipmentFilter !== "all")}
                      />
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-muted bg-muted/20 p-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    Aún no tienes ejercicios de {section.title} registrados.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )
    }
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-3xl font-bold text-foreground">Ejercicios</h1>
              <Button onClick={handleScanQR} size="lg" className="gap-2 shadow-md">
                <ScanLine className="w-5 h-5" />
                <span className="hidden sm:inline">Escanear QR</span>
              </Button>
            </div>

            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar ejercicio o máquina..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtros */}
        <div className="flex flex-col gap-5 mb-8">
          {/* Chips de grupo muscular */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Grupo muscular
            </p>
            <div className="flex flex-wrap gap-2">
              {muscleGroups.map((muscle) => (
                <button
                  key={muscle}
                  type="button"
                  onClick={() => setSelectedMuscle(selectedMuscle === muscle ? null : muscle)}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-semibold transition-all shadow-sm",
                    selectedMuscle === muscle
                      ? "bg-primary text-primary-foreground shadow-md scale-105"
                      : "bg-muted text-muted-foreground hover:bg-muted/70 hover:scale-105"
                  )}
                >
                  {muscle}
                </button>
              ))}
            </div>
          </div>

          {/* Dropdown equipo + Orden */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[180px]">
              <select
                value={equipmentFilter}
                onChange={(e) => setEquipmentFilter(e.target.value as EquipmentFilter)}
                className="appearance-none w-full pl-4 pr-10 py-2.5 rounded-lg border-2 border-input bg-background text-foreground text-sm font-semibold focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 cursor-pointer transition-all"
              >
                <option value="all">Todos los equipos</option>
                <option value="maquina-qr">Máquina (QR)</option>
                <option value="maquina-sin-qr">Máquina (sin QR)</option>
                <option value="peso-libre">Peso libre (Manual)</option>
                <option value="polea-qr">Polea (QR)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            </div>

            <div className="relative min-w-[120px]">
              <select
                value={order}
                onChange={(e) => setOrder(e.target.value as OrderType)}
                className="appearance-none w-full pl-4 pr-10 py-2.5 rounded-lg border-2 border-input bg-background text-foreground text-sm font-semibold focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 cursor-pointer transition-all"
              >
                <option value="a-z">A→Z</option>
                <option value="z-a">Z→A</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upper" | "lower")}>
          <TabsList className="grid w-full grid-cols-2 h-12 p-1 mb-8">
            <TabsTrigger value="upper" className="font-semibold text-sm">
              Tren superior
            </TabsTrigger>
            <TabsTrigger value="lower" className="font-semibold text-sm">
              Inferior + Core
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upper" className="mt-0">
            {renderExercisesByRegion("upper")}
          </TabsContent>

          <TabsContent value="lower" className="mt-0">
            {renderExercisesByRegion("lower")}
          </TabsContent>
        </Tabs>
      </div>

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
  dimmed?: boolean
}

function ExerciseCard({ exercise, onRegister, dimmed = false }: ExerciseCardProps) {
  return (
    <Card
      className={cn(
        "border border-border hover:border-primary/40 hover:shadow-lg transition-all duration-200 group",
        dimmed && "opacity-40 hover:opacity-100"
      )}
    >
      <CardContent className="p-5">
        <div className="flex flex-col gap-3.5">
          {/* Header: Código + Badge QR */}
          <div className="flex items-start justify-between gap-2">
            <Badge variant="secondary" className="text-[10px] font-mono font-bold px-2 py-0.5">
              {exercise.code}
            </Badge>
            {exercise.qrEnabled ? (
              <div className="flex items-center gap-1 text-[10px] font-semibold text-primary">
                <CheckCircle2 className="w-3 h-3" />
                <span className="uppercase tracking-wide">QR</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] font-semibold text-orange-500">
                <AlertTriangle className="w-3 h-3" />
                <span className="uppercase tracking-wide">Manual</span>
              </div>
            )}
          </div>

          {/* Nombre */}
          <div>
            <h4 className="text-base font-bold text-foreground leading-tight mb-1">
              {exercise.name}
            </h4>
            <p className="text-xs text-muted-foreground">
              {exercise.equipment}
            </p>
          </div>

          {/* Chips de músculos */}
          <div className="flex flex-wrap gap-1.5">
            <Badge className="text-[11px] bg-primary text-primary-foreground border-0 font-semibold px-2 py-0.5">
              {exercise.primaryMuscle}
            </Badge>
            {exercise.secondaryMuscles.map((muscle) => (
              <Badge
                key={muscle}
                variant="outline"
                className="text-[11px] text-muted-foreground border-border/50 font-medium px-2 py-0.5"
              >
                {muscle}
              </Badge>
            ))}
          </div>

          {/* Info adicional */}
          {!exercise.qrEnabled && (
            <p className="text-[10px] text-orange-600 bg-orange-50 dark:bg-orange-950/20 px-2 py-1 rounded">
              No cuenta para ranking
            </p>
          )}

          {/* Botón Registrar */}
          <Button
            onClick={() => onRegister(exercise)}
            size="sm"
            className={cn(
              "w-full mt-1 font-semibold transition-all",
              exercise.qrEnabled
                ? "bg-primary hover:bg-primary/90 shadow-sm"
                : "bg-muted hover:bg-muted/80 text-foreground"
            )}
          >
            <Dumbbell className="w-4 h-4 mr-2" />
            Registrar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
