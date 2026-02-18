"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  ScanLine,
  Dumbbell,
  CheckCircle2,
  AlertTriangle,
  Plus,
  X,
  Trash2,
  Play,
  ListChecks,
  Check,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer"
import {
  exerciseCatalog,
  type ExerciseItem,
  type MuscleGroup,
} from "@/lib/exercise-catalog"
import { cn } from "@/lib/utils"

// ── Tipos ────────────────────────────────────────────────
type OrderType = "a-z" | "z-a"
type EquipmentFilter = "all" | "maquina-qr" | "maquina-sin-qr" | "peso-libre" | "polea-qr"

interface QuickListItem {
  exerciseId: string
  addedAt: number
}

// ── Constantes ───────────────────────────────────────────
const STORAGE_KEY = "minthy-quick-list"

const muscleGroups: MuscleGroup[] = [
  "Pecho", "Espalda", "Hombros", "Biceps",
  "Cuadriceps", "Femorales", "Gluteos", "Abductores", "Core",
]

const upperSections = ["Multifuncional", "Espalda", "Pecho", "Hombros", "Brazos"] as const
const lowerSections = ["Multifuncional", "Cuádriceps", "Isquios/Femorales", "Glúteos/Abductores", "Core"] as const

function sectionId(tab: string, section: string) {
  return `section-${tab}-${section.replace(/[\s\/]/g, "-").toLowerCase()}`
}

// ── localStorage helpers ─────────────────────────────────
function loadQuickList(): QuickListItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveQuickList(list: QuickListItem[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

// ══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════
export function ExercisesContent() {
  const router = useRouter()

  // Filtros
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null)
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentFilter>("all")
  const [order, setOrder] = useState<OrderType>("a-z")
  const [activeTab, setActiveTab] = useState<"upper" | "lower">("upper")

  // Modal registro manual
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<ExerciseItem | null>(null)

  // Lista rápida (persiste en localStorage)
  const [quickList, setQuickList] = useState<QuickListItem[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Cargar lista de localStorage al montar
  useEffect(() => {
    setQuickList(loadQuickList())
  }, [])

  // Guardar en localStorage cuando cambia
  const updateQuickList = useCallback((newList: QuickListItem[]) => {
    setQuickList(newList)
    saveQuickList(newList)
  }, [])

  const addToQuickList = useCallback((exerciseId: string) => {
    setQuickList((prev) => {
      if (prev.some((item) => item.exerciseId === exerciseId)) return prev
      const next = [...prev, { exerciseId, addedAt: Date.now() }]
      saveQuickList(next)
      return next
    })
  }, [])

  const removeFromQuickList = useCallback((exerciseId: string) => {
    setQuickList((prev) => {
      const next = prev.filter((item) => item.exerciseId !== exerciseId)
      saveQuickList(next)
      return next
    })
  }, [])

  const clearQuickList = useCallback(() => {
    updateQuickList([])
  }, [updateQuickList])

  const isInQuickList = (exerciseId: string) =>
    quickList.some((item) => item.exerciseId === exerciseId)

  // Helpers
  const hasActiveFilters = !!searchQuery || !!selectedMuscle || equipmentFilter !== "all"

  const matchesFilters = (ex: ExerciseItem) => {
    if (!hasActiveFilters) return true
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      if (
        !ex.name.toLowerCase().includes(q) &&
        !ex.code.toLowerCase().includes(q) &&
        !ex.primaryMuscle.toLowerCase().includes(q) &&
        !ex.secondaryMuscles.some((m) => m.toLowerCase().includes(q))
      ) return false
    }
    if (selectedMuscle) {
      if (ex.primaryMuscle !== selectedMuscle && !ex.secondaryMuscles.includes(selectedMuscle)) return false
    }
    if (equipmentFilter !== "all") {
      if (equipmentFilter === "maquina-qr" && !(ex.equipment === "Maquina" && ex.qrEnabled)) return false
      if (equipmentFilter === "maquina-sin-qr" && !(ex.equipment === "Maquina" && !ex.qrEnabled)) return false
      if (equipmentFilter === "peso-libre" && ex.equipment !== "Peso libre") return false
      if (equipmentFilter === "polea-qr" && !(ex.equipment === "Polea" && ex.qrEnabled)) return false
    }
    return true
  }

  const handleScanQR = () => router.push("/dashboard/scan")

  const handleRegister = (exercise: ExerciseItem) => {
    if (exercise.qrEnabled) {
      router.push("/dashboard/scan")
    } else {
      setSelectedExercise(exercise)
      setManualModalOpen(true)
    }
  }

  const handleStartFromList = (exercise: ExerciseItem) => {
    if (exercise.qrEnabled) {
      router.push("/dashboard/scan")
    } else {
      setSelectedExercise(exercise)
      setManualModalOpen(true)
      setDrawerOpen(false)
    }
  }

  const scrollToSection = (tab: string, section: string) => {
    const el = document.getElementById(sectionId(tab, section))
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const getSectionItems = (region: "upper" | "lower", title: string): ExerciseItem[] => {
    const all = exerciseCatalog.filter((ex) => ex.region.includes(region))
    switch (title) {
      case "Multifuncional": return all.filter((ex) => ex.isMultifunctional)
      case "Espalda": return all.filter((ex) => ex.category === "Espalda")
      case "Pecho": return all.filter((ex) => ex.category === "Pecho")
      case "Hombros": return all.filter((ex) => ex.category === "Hombros")
      case "Brazos": return []
      case "Cuádriceps": return all.filter((ex) => ex.category === "Cuadriceps")
      case "Isquios/Femorales": return all.filter((ex) => ex.category === "Isquios / Femorales")
      case "Glúteos/Abductores": return all.filter((ex) => ex.category === "Gluteos / Abductores")
      case "Core": return all.filter((ex) => ex.primaryMuscle === "Core")
      default: return []
    }
  }

  const sortItems = (items: ExerciseItem[]) =>
    [...items].sort((a, b) => order === "a-z" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name))

  const getBrazosCount = () =>
    exerciseCatalog.filter((ex) =>
      ex.region.includes("upper") &&
      (ex.secondaryMuscles.includes("Biceps") || ex.secondaryMuscles.includes("Triceps"))
    ).length

  // ── Render sección ─────────────────────────────────────
  const renderSection = (region: "upper" | "lower", title: string, tabKey: string) => {
    if (title === "Brazos") {
      const count = getBrazosCount()
      return (
        <div key={title} id={sectionId(tabKey, title)} className="scroll-mt-48">
          <div className="flex items-baseline gap-2 mb-2">
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              Brazos (Bíceps / Tríceps)
            </h3>
            <span className="text-[10px] text-muted-foreground font-mono">{count}</span>
          </div>
          <div className="rounded-md border border-border bg-muted/5 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{count}</span> ejercicios trabajan Bíceps/Tríceps como secundario.
              <span className="ml-1 opacity-70">Filtra por músculo para verlos.</span>
            </p>
          </div>
        </div>
      )
    }

    const items = sortItems(getSectionItems(region, title))

    return (
      <div key={title} id={sectionId(tabKey, title)} className="scroll-mt-48">
        <div className="flex items-baseline gap-2 mb-2">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            {title}
          </h3>
          <span className="text-[10px] text-muted-foreground font-mono">{items.length}</span>
        </div>

        {items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((ex) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                onRegister={handleRegister}
                onAdd={addToQuickList}
                inList={isInQuickList(ex.id)}
                dimmed={!matchesFilters(ex) && hasActiveFilters}
              />
            ))}
          </div>
        ) : (
          <div className="col-span-full rounded-md border border-dashed border-muted bg-muted/5 px-3 py-2.5 text-center">
            <p className="text-[11px] text-muted-foreground">Sin ejercicios de {title} por ahora.</p>
          </div>
        )}
      </div>
    )
  }

  const currentSections = activeTab === "upper" ? upperSections : lowerSections

  // ── Contenido de la lista rápida (compartido entre panel XL y drawer) ──
  const quickListContent = (
    <QuickListPanel
      quickList={quickList}
      onStart={handleStartFromList}
      onRemove={removeFromQuickList}
      onClear={clearQuickList}
    />
  )

  // ══════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════
  return (
    <div className="w-full min-h-0">
      {/* ─── HEADER FIJO ─── */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3">
          {/* Row 1: título + escanear + lista(mobile) */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <h1 className="text-lg font-bold text-foreground">Ejercicios</h1>
            <div className="flex items-center gap-2">
              {/* Botón lista rápida (SOLO mobile/tablet, oculto en xl) */}
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="xl:hidden relative flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-input bg-background text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <ListChecks className="w-3.5 h-3.5" />
                Lista
                {quickList.length > 0 && (
                  <span className="ml-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {quickList.length}
                  </span>
                )}
              </button>
              <Button onClick={handleScanQR} size="sm" className="gap-1.5 text-xs h-8">
                <ScanLine className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Escanear QR</span>
                <span className="sm:hidden">QR</span>
              </Button>
            </div>
          </div>

          {/* Row 2: buscador */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar ejercicio o máquina..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-md border border-input bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Row 3: chips musculares + dropdowns (1 fila, scroll horizontal) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 min-w-0 pb-0.5">
              {muscleGroups.map((muscle) => (
                <button
                  key={muscle}
                  type="button"
                  onClick={() => setSelectedMuscle(selectedMuscle === muscle ? null : muscle)}
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-all flex-shrink-0",
                    selectedMuscle === muscle
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {muscle}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <select
                value={equipmentFilter}
                onChange={(e) => setEquipmentFilter(e.target.value as EquipmentFilter)}
                className="appearance-none pl-2 pr-5 py-0.5 rounded border border-input bg-background text-[10px] font-medium focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="all">Equipo</option>
                <option value="maquina-qr">Máquina QR</option>
                <option value="maquina-sin-qr">Máquina</option>
                <option value="peso-libre">Peso libre</option>
                <option value="polea-qr">Polea QR</option>
              </select>
              <select
                value={order}
                onChange={(e) => setOrder(e.target.value as OrderType)}
                className="appearance-none pl-2 pr-5 py-0.5 rounded border border-input bg-background text-[10px] font-medium focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="a-z">A-Z</option>
                <option value="z-a">Z-A</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ─── BODY: catálogo (+ panel en xl) ─── */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-4">
        <div className={quickList.length > 0 ? "xl:grid xl:grid-cols-[1fr_320px] xl:gap-6" : ""}>
          {/* ── Catálogo (izquierda) ── */}
          <div className="min-w-0">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upper" | "lower")}>
              <TabsList className="grid w-full grid-cols-2 h-9 p-0.5 mb-3">
                <TabsTrigger value="upper" className="font-semibold text-xs">
                  Tren superior
                </TabsTrigger>
                <TabsTrigger value="lower" className="font-semibold text-xs">
                  Inferior + Core
                </TabsTrigger>
              </TabsList>

              {/* Subnav ancla */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mb-4 pb-0.5">
                {currentSections.map((section) => (
                  <button
                    key={section}
                    type="button"
                    onClick={() => scrollToSection(activeTab, section)}
                    className="px-2.5 py-1 rounded text-[10px] font-medium whitespace-nowrap bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground transition-all flex-shrink-0"
                  >
                    {section}
                  </button>
                ))}
              </div>

              <TabsContent value="upper" className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                  {(upperSections as readonly string[]).map((s) => renderSection("upper", s, "upper"))}
                </div>
              </TabsContent>

              <TabsContent value="lower" className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                  {(lowerSections as readonly string[]).map((s) => renderSection("lower", s, "lower"))}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* ── Panel derecho: Lista rápida (SOLO xl, solo si hay items) ── */}
          {quickList.length > 0 && (
            <aside className="hidden xl:block">
              <div className="sticky top-[140px]">
                {quickListContent}
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* ─── DRAWER MOBILE: Lista rápida ─── */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-base">Lista rápida de hoy</DrawerTitle>
              <DrawerClose asChild>
                <button type="button" className="p-1 rounded-md hover:bg-muted">
                  <X className="w-4 h-4" />
                </button>
              </DrawerClose>
            </div>
            <DrawerDescription className="text-xs">
              {quickList.length} ejercicio{quickList.length !== 1 ? "s" : ""} en tu lista
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto max-h-[60vh]">
            {quickListContent}
          </div>
        </DrawerContent>
      </Drawer>

      {/* ─── MODAL REGISTRO MANUAL ─── */}
      {manualModalOpen && selectedExercise && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm"
          onClick={() => setManualModalOpen(false)}
        >
          <Card className="w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Registro manual</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Registrando: <span className="font-semibold text-foreground">{selectedExercise.name}</span>
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setManualModalOpen(false)} className="flex-1 text-xs">
                  Cancelar
                </Button>
                <Button size="sm" onClick={() => { setManualModalOpen(false); router.push("/dashboard/manual") }} className="flex-1 text-xs">
                  Ir a registro
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// PANEL "LISTA RÁPIDA DE HOY"
// ══════════════════════════════════════════════════════════
interface QuickListPanelProps {
  quickList: QuickListItem[]
  onStart: (exercise: ExerciseItem) => void
  onRemove: (exerciseId: string) => void
  onClear: () => void
}

function QuickListPanel({ quickList, onStart, onRemove, onClear }: QuickListPanelProps) {
  const exercises = quickList
    .map((item) => exerciseCatalog.find((ex) => ex.id === item.exerciseId))
    .filter(Boolean) as ExerciseItem[]

  if (exercises.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-muted bg-muted/5 p-4 text-center">
        <ListChecks className="w-5 h-5 text-muted-foreground mx-auto mb-2 opacity-40" />
        <p className="text-xs text-muted-foreground">Tu lista está vacía.</p>
        <p className="text-[10px] text-muted-foreground mt-1 opacity-70">
          Usa el botón &ldquo;+&rdquo; en las tarjetas para agregar ejercicios.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Header solo en panel XL (en drawer ya tiene su header) */}
      <div className="hidden xl:flex items-center justify-between mb-1">
        <div>
          <h2 className="text-sm font-bold text-foreground">Lista rápida de hoy</h2>
          <p className="text-[10px] text-muted-foreground">{exercises.length} ejercicio{exercises.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 text-[10px] text-destructive hover:text-destructive/80 font-medium transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Limpiar
        </button>
      </div>

      {/* Botón limpiar (solo en drawer, xl tiene el suyo arriba) */}
      <div className="xl:hidden flex justify-end mb-1">
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 text-[10px] text-destructive hover:text-destructive/80 font-medium"
        >
          <Trash2 className="w-3 h-3" />
          Limpiar todo
        </button>
      </div>

      {/* Items */}
      <div className="flex flex-col gap-1.5">
        {exercises.map((ex) => (
          <div
            key={ex.id}
            className="flex items-center gap-2 rounded-md border border-border bg-card p-2 group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{ex.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-muted-foreground">{ex.primaryMuscle}</span>
                {ex.qrEnabled ? (
                  <span className="text-[9px] font-semibold text-primary flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" />QR
                  </span>
                ) : (
                  <span className="text-[9px] font-semibold text-orange-500">Manual</span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onStart(ex)}
              className="flex-shrink-0 px-2 py-1 rounded bg-primary text-primary-foreground text-[10px] font-semibold hover:bg-primary/90 transition-colors"
            >
              <Play className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onRemove(ex.id)}
              className="flex-shrink-0 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// EXERCISE CARD COMPACTA
// ══════════════════════════════════════════════════════════
interface ExerciseCardProps {
  exercise: ExerciseItem
  onRegister: (exercise: ExerciseItem) => void
  onAdd: (exerciseId: string) => void
  inList: boolean
  dimmed?: boolean
}

const MAX_CHIPS = 3

function ExerciseCard({ exercise, onRegister, onAdd, inList, dimmed = false }: ExerciseCardProps) {
  const allMuscles = [exercise.primaryMuscle, ...exercise.secondaryMuscles]
  const visible = allMuscles.slice(0, MAX_CHIPS)
  const extra = allMuscles.length - MAX_CHIPS

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-3 flex flex-col gap-1.5 hover:border-primary/30 hover:shadow-sm transition-all duration-150 w-full",
        dimmed && "opacity-35 hover:opacity-100"
      )}
    >
      {/* Row 1: código + QR badge */}
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-mono font-bold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
          {exercise.code}
        </span>
        {exercise.qrEnabled ? (
          <span className="flex items-center gap-0.5 text-[9px] font-bold text-primary">
            <CheckCircle2 className="w-2.5 h-2.5" />QR
          </span>
        ) : (
          <span className="flex items-center gap-0.5 text-[9px] font-bold text-orange-500">
            <AlertTriangle className="w-2.5 h-2.5" />Manual
          </span>
        )}
      </div>

      {/* Row 2: nombre */}
      <h4 className="text-[13px] font-semibold text-foreground leading-tight truncate">
        {exercise.name}
      </h4>

      {/* Row 3: equipo */}
      <p className="text-[10px] text-muted-foreground leading-none">
        {exercise.equipment} &bull; {exercise.qrEnabled ? "QR" : "Manual"}
      </p>

      {/* Row 4: chips */}
      <div className="flex flex-wrap items-center gap-0.5 mt-0.5">
        {visible.map((muscle, i) => (
          <span
            key={muscle}
            className={cn(
              "text-[9px] px-1.5 py-0.5 rounded-full font-medium leading-none",
              i === 0 ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground"
            )}
          >
            {muscle}
          </span>
        ))}
        {extra > 0 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted/30 text-muted-foreground font-medium leading-none">
            +{extra}
          </span>
        )}
      </div>

      {/* Row 5: acciones */}
      <div className="flex items-center gap-1.5 mt-1">
        <button
          onClick={() => onRegister(exercise)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-semibold transition-all",
            exercise.qrEnabled
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-foreground hover:bg-muted/80"
          )}
        >
          <Dumbbell className="w-3 h-3" />
          Registrar
        </button>
        <button
          type="button"
          onClick={() => !inList && onAdd(exercise.id)}
          disabled={inList}
          className={cn(
            "flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-md border transition-all",
            inList
              ? "border-primary/30 bg-primary/5 text-primary cursor-default"
              : "border-input bg-background text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5"
          )}
          title={inList ? "Ya en la lista" : "Añadir a lista rápida"}
        >
          {inList ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  )
}
