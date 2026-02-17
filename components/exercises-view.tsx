"use client"

import { useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Dumbbell,
  Search,
  ListChecks,
  X,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Grip,
  ScanLine,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import {
  type Exercise,
  getExercisesByTab,
  getSectionsForTab,
} from "@/lib/exercises-data"

const difficultyConfig = {
  principiante: { label: "Principiante", className: "bg-primary/10 text-primary" },
  intermedio: { label: "Intermedio", className: "bg-accent/15 text-accent" },
  avanzado: { label: "Avanzado", className: "bg-destructive/10 text-destructive" },
}

// –– Quick List Item –––––––––––––––––––––––––––––––––––––––––––
interface QuickListItem {
  exerciseId: string
  name: string
  section: string
}

// –– Section Panel Component –––––––––––––––––––––––––––––––––––
function SectionPanel({
  sectionName,
  exercises,
  quickList,
  onAddToQuickList,
  collapsedSections,
  onToggleCollapse,
}: {
  sectionName: string
  exercises: Exercise[]
  quickList: QuickListItem[]
  onAddToQuickList: (ex: Exercise) => void
  collapsedSections: Set<string>
  onToggleCollapse: (section: string) => void
}) {
  const isCollapsed = collapsedSections.has(sectionName)
  const quickListIds = new Set(quickList.map((q) => q.exerciseId))

  return (
    <Card className="border border-border">
      <CardHeader className="pb-0">
        <button
          type="button"
          onClick={() => onToggleCollapse(sectionName)}
          className="flex items-center justify-between w-full text-left"
        >
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
              <Dumbbell className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-foreground">{sectionName}</span>
            <Badge variant="secondary" className="text-xs font-normal">
              {exercises.length}
            </Badge>
          </CardTitle>
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="pt-3">
          <div className="flex flex-col gap-1.5">
            {exercises.map((ex) => {
              const isInList = quickListIds.has(ex.id)
              const diff = difficultyConfig[ex.difficulty]
              return (
                <div
                  key={ex.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary shrink-0">
                    <Grip className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{ex.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{ex.muscles.join(", ")}</span>
                      {ex.sets && ex.reps && (
                        <span className="text-xs text-muted-foreground/70">
                          &middot; {ex.sets}x{ex.reps}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge className={cn("border-0 text-[10px] shrink-0 hidden sm:flex", diff.className)}>
                    {diff.label}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 w-7 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
                      isInList && "opacity-100 text-primary"
                    )}
                    onClick={() => onAddToQuickList(ex)}
                    title={isInList ? "Ya en lista" : "Agregar a lista rapida"}
                    disabled={isInList}
                  >
                    {isInList ? (
                      <ListChecks className="w-3.5 h-3.5" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// –– Quick List Sidebar/Drawer Content –––––––––––––––––––––––––
function QuickListContent({
  quickList,
  onRemove,
  onClear,
}: {
  quickList: QuickListItem[]
  onRemove: (id: string) => void
  onClear: () => void
}) {
  const router = useRouter()
  if (quickList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-muted mb-3">
          <ListChecks className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">Lista vacia</p>
        <p className="text-xs text-muted-foreground mt-1">
          Agrega ejercicios desde el catalogo con el boton +
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-1 mb-2">
        <p className="text-xs text-muted-foreground">
          {quickList.length} ejercicio{quickList.length !== 1 ? "s" : ""}
        </p>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={onClear}>
          <Trash2 className="w-3 h-3 mr-1" />
          Limpiar
        </Button>
      </div>
      {quickList.map((item, i) => (
        <div
          key={item.exerciseId}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 group"
        >
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0">
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.section}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs gap-1 shrink-0"
            onClick={() => router.push("/dashboard/scan")}
          >
            <ScanLine className="w-3 h-3" />
            Escanear
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={() => onRemove(item.exerciseId)}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ))}
    </div>
  )
}

// –– Main Exercises View –––––––––––––––––––––––––––––––––––––––
export function ExercisesView() {
  const [activeTab, setActiveTab] = useState<"upper" | "lower">("upper")
  const [searchQuery, setSearchQuery] = useState("")
  const [quickList, setQuickList] = useState<QuickListItem[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  const toggleCollapse = useCallback((section: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }, [])

  const addToQuickList = useCallback((ex: Exercise) => {
    setQuickList((prev) => {
      if (prev.find((q) => q.exerciseId === ex.id)) return prev
      return [...prev, { exerciseId: ex.id, name: ex.name, section: ex.section }]
    })
  }, [])

  const removeFromQuickList = useCallback((exerciseId: string) => {
    setQuickList((prev) => prev.filter((q) => q.exerciseId !== exerciseId))
  }, [])

  const clearQuickList = useCallback(() => {
    setQuickList([])
  }, [])

  // Filtered + grouped exercises
  const { sections, grouped } = useMemo(() => {
    const sectionNames = getSectionsForTab(activeTab)
    const groupedAll = getExercisesByTab(activeTab)

    if (!searchQuery.trim()) {
      return { sections: sectionNames, grouped: groupedAll }
    }

    const q = searchQuery.toLowerCase()
    const filteredGrouped: Record<string, Exercise[]> = {}
    const filteredSections: string[] = []

    for (const section of sectionNames) {
      const exercises = (groupedAll[section] || []).filter(
        (ex) =>
          ex.name.toLowerCase().includes(q) ||
          ex.muscles.some((m) => m.toLowerCase().includes(q)) ||
          ex.equipment.toLowerCase().includes(q)
      )
      if (exercises.length > 0) {
        filteredGrouped[section] = exercises
        filteredSections.push(section)
      }
    }

    return { sections: filteredSections, grouped: filteredGrouped }
  }, [activeTab, searchQuery])

  const totalExercises = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 lg:px-6 lg:py-8">
      {/* Header with Quick List toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
            <Dumbbell className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
              Ejercicios
            </h1>
            <p className="text-sm text-muted-foreground">
              Catalogo completo de ejercicios disponibles en tu gym
            </p>
          </div>
        </div>

        {/* Quick List button -- Sheet Trigger for mobile/tablet, toggle for XL */}
        <div className="flex items-center gap-2">
          {/* Mobile / Tablet: Sheet (Drawer) */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="relative xl:hidden">
                <ListChecks className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Lista</span>
                {quickList.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {quickList.length}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 sm:w-96">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-primary" />
                  Lista rapida de hoy
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <QuickListContent
                  quickList={quickList}
                  onRemove={removeFromQuickList}
                  onClear={clearQuickList}
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* XL: Toggle sidebar */}
          <Button
            variant={sidebarOpen ? "default" : "outline"}
            size="sm"
            className="relative hidden xl:flex"
            onClick={() => setSidebarOpen((prev) => !prev)}
          >
            <ListChecks className="w-4 h-4 mr-1.5" />
            Lista
            {quickList.length > 0 && (
              <span className={cn(
                "absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold",
                sidebarOpen ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
              )}>
                {quickList.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* 12-column grid layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Main content: full width when sidebar closed, 8 cols when open on XL */}
        <div className={cn(
          "col-span-12",
          sidebarOpen && "xl:col-span-8"
        )}>
          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar ejercicio, musculo o equipo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upper" | "lower")}>
            <TabsList className="w-full mb-4">
              <TabsTrigger value="upper" className="flex-1">
                Tren superior
              </TabsTrigger>
              <TabsTrigger value="lower" className="flex-1">
                Inferior + Core
              </TabsTrigger>
            </TabsList>

            {/* Summary */}
            <div className="flex items-center gap-2 mb-4">
              <p className="text-xs text-muted-foreground">
                {totalExercises} ejercicio{totalExercises !== 1 ? "s" : ""} en {sections.length} seccion{sections.length !== 1 ? "es" : ""}
              </p>
            </div>

            {/* Tab Content: sections in 2-col grid */}
            <TabsContent value="upper" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {sections.map((section) => (
                  <SectionPanel
                    key={section}
                    sectionName={section}
                    exercises={grouped[section] || []}
                    quickList={quickList}
                    onAddToQuickList={addToQuickList}
                    collapsedSections={collapsedSections}
                    onToggleCollapse={toggleCollapse}
                  />
                ))}
              </div>
              {sections.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground">No se encontraron ejercicios</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="lower" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {sections.map((section) => (
                  <SectionPanel
                    key={section}
                    sectionName={section}
                    exercises={grouped[section] || []}
                    quickList={quickList}
                    onAddToQuickList={addToQuickList}
                    collapsedSections={collapsedSections}
                    onToggleCollapse={toggleCollapse}
                  />
                ))}
              </div>
              {sections.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground">No se encontraron ejercicios</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right panel: XL sidebar -- ONLY rendered when open */}
        {sidebarOpen && (
          <div className="hidden xl:block xl:col-span-4">
            <div className="sticky top-6">
              <Card className="border border-border">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-primary" />
                      Lista rapida de hoy
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <QuickListContent
                    quickList={quickList}
                    onRemove={removeFromQuickList}
                    onClear={clearQuickList}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
