"use client"

import { useState, useMemo, useEffect } from "react"
import {
  BookOpen,
  Search,
  Dumbbell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Play,
  ShieldAlert,
  XCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { translateMuscleGroups } from "@/lib/utils"

interface TutorialListItem {
  machineId: string
  machineName: string
  muscles: string[]
  tutorialId: string
  title: string
}

interface TutorialListResponse {
  items?: TutorialListItem[]
}

interface TutorialDetailItem {
  machineId: string
  machineName: string
  muscles: string[]
  tutorialId: string
  title: string
  steps: string[]
  safetyTips: string[]
  commonErrors: string[]
  videoUrl: string | null
}

interface TutorialDetailResponse {
  item?: TutorialDetailItem
}

export function TutorialsView() {
  const { tutorialsSeen, loadTutorialProgress, markTutorialSeen } = useStore()
  const [items, setItems] = useState<TutorialListItem[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [listRequestKey, setListRequestKey] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<TutorialDetailItem | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [detailRequestKey, setDetailRequestKey] = useState(0)
  const [markingSeen, setMarkingSeen] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    const loadList = async () => {
      setListLoading(true)
      setListError(null)

      try {
        await loadTutorialProgress()

        const response = await fetch("/api/client/tutorials", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error("tutorials_list_fetch_failed")
        }

        const payload = (await response.json()) as TutorialListResponse
        setItems(payload.items ?? [])
      } catch {
        if (controller.signal.aborted) return
        setItems([])
        setListError("No fue posible cargar tutoriales")
      } finally {
        if (!controller.signal.aborted) {
          setListLoading(false)
        }
      }
    }

    void loadList()

    return () => controller.abort()
  }, [loadTutorialProgress, listRequestKey])

  useEffect(() => {
    const controller = new AbortController()

    if (!selectedMachine) {
      setSelectedDetail(null)
      setDetailError(null)
      setDetailLoading(false)
      return () => controller.abort()
    }

    const loadDetail = async () => {
      setDetailLoading(true)
      setDetailError(null)

      try {
        const response = await fetch(`/api/client/tutorials/${encodeURIComponent(selectedMachine)}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error("tutorial_detail_fetch_failed")
        }

        const payload = (await response.json()) as TutorialDetailResponse
        if (!payload.item) {
          throw new Error("tutorial_detail_empty")
        }

        setSelectedDetail(payload.item)
      } catch {
        if (controller.signal.aborted) return
        setSelectedDetail(null)
        setDetailError("No fue posible cargar este tutorial")
      } finally {
        if (!controller.signal.aborted) {
          setDetailLoading(false)
        }
      }
    }

    void loadDetail()

    return () => controller.abort()
  }, [selectedMachine, detailRequestKey])

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items
    const q = searchQuery.toLowerCase()
    return items.filter(
      (item) =>
        item.machineName.toLowerCase().includes(q) ||
        item.muscles.some((muscle) => muscle.toLowerCase().includes(q))
    )
  }, [items, searchQuery])

  const selectedItem = useMemo(
    () => items.find((item) => item.machineId === selectedMachine) ?? null,
    [items, selectedMachine]
  )

  const seenCount = Object.values(tutorialsSeen).filter(Boolean).length
  const totalCount = items.length

  const handleSelectMachine = (machineId: string) => {
    setSelectedMachine(machineId)
    setSelectedDetail(null)
    setDetailError(null)
    setDetailRequestKey(0)
  }

  const handleMarkSeen = async () => {
    if (!selectedMachine) return
    const tutorialId = selectedDetail?.tutorialId ?? selectedItem?.tutorialId
    setMarkingSeen(true)
    await markTutorialSeen(selectedMachine, tutorialId)
    setMarkingSeen(false)
  }

  if (selectedMachine) {
    const isSeen = tutorialsSeen[selectedMachine] || false

    if (detailLoading || !selectedDetail) {
      if (detailLoading) {
        return (
          <div className="flex flex-col gap-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedMachine(null)} className="self-start -ml-2">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Volver a lista
            </Button>
            <Card className="border border-border">
              <CardContent className="py-10 text-center">
                <p className="text-sm text-muted-foreground">Cargando tutorial...</p>
              </CardContent>
            </Card>
          </div>
        )
      }

      return (
        <div className="flex flex-col gap-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedMachine(null)} className="self-start -ml-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver a lista
          </Button>
          <Card className="border border-border">
            <CardContent className="py-10 text-center">
              <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                {detailError ?? "Tutorial no disponible"}
              </p>
              <Button variant="outline" onClick={() => setDetailRequestKey((prev) => prev + 1)}>
                Reintentar
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-4">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => setSelectedMachine(null)} className="self-start -ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Volver a lista
        </Button>

        {/* Machine header */}
        <Card className="border border-border">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 shrink-0">
              <Dumbbell className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-foreground">{selectedDetail.machineName}</h2>
                <Badge className={`border-0 text-xs ${isSeen ? "bg-primary/10 text-primary" : "bg-accent/15 text-accent"}`}>
                  {isSeen ? "Visto" : "Pendiente"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{translateMuscleGroups(selectedDetail.muscles)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Video placeholder */}
        <Card className="border border-border overflow-hidden">
          {selectedDetail.videoUrl ? (
            <a
              href={selectedDetail.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="relative bg-foreground/5 flex items-center justify-center h-48 hover:bg-foreground/10 transition-colors"
            >
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/15">
                  <Play className="w-7 h-7 text-primary ml-0.5" />
                </div>
                <p className="text-xs">Ver video tutorial</p>
              </div>
            </a>
          ) : (
            <div className="relative bg-foreground/5 flex items-center justify-center h-48">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/15">
                  <Play className="w-7 h-7 text-primary ml-0.5" />
                </div>
                <p className="text-xs">Video no disponible</p>
              </div>
            </div>
          )}
        </Card>

        {/* Technique steps */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Tecnica correcta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-2.5">
              {selectedDetail.steps.map((step, i) => (
                <li key={`step-${i}`} className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-foreground leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Safety */}
        <Card className="border border-destructive/20 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-4 h-4" />
              Seguridad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {(selectedDetail.safetyTips.length > 0 ? selectedDetail.safetyTips : ["Sin recomendaciones de seguridad registradas"])
                .map((tip, i) => (
                <li key={`safety-${i}`} className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">{tip}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Common errors */}
        <Card className="border border-accent/20 bg-accent/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-accent">
              <XCircle className="w-4 h-4" />
              Errores comunes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {(selectedDetail.commonErrors.length > 0 ? selectedDetail.commonErrors : ["Sin errores comunes registrados"])
                .map((err, i) => (
                <li key={`err-${i}`} className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">{err}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Mark as seen */}
        {!isSeen && (
          <Button onClick={handleMarkSeen} size="lg" className="w-full" disabled={markingSeen}>
            <CheckCircle2 className="w-5 h-5 mr-2" />
            {markingSeen ? "Guardando..." : "Marcar como visto"}
          </Button>
        )}
      </div>
    )
  }

  if (listLoading) {
    return (
      <Card className="border border-border">
        <CardContent className="py-10 text-center">
          <p className="text-sm text-muted-foreground">Cargando tutoriales...</p>
        </CardContent>
      </Card>
    )
  }

  if (listError) {
    return (
      <Card className="border border-border">
        <CardContent className="py-10 text-center">
          <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">{listError}</p>
          <Button variant="outline" onClick={() => setListRequestKey((prev) => prev + 1)}>
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Machine list view
  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <Card className="border border-border">
        <CardContent className="flex items-center gap-4 py-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{seenCount} de {totalCount} tutoriales vistos</p>
            <p className="text-xs text-muted-foreground">Completa todos los tutoriales para un entrenamiento seguro</p>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar maquina..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Machine list */}
      <div className="flex flex-col gap-2">
        {filteredItems.length === 0 && (
          <Card className="border border-border">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {items.length === 0 ? "No hay tutoriales disponibles." : "No se encontraron tutoriales para esa búsqueda."}
              </p>
            </CardContent>
          </Card>
        )}

        {filteredItems.map((item) => {
          const isSeen = tutorialsSeen[item.machineId] || false
          return (
            <button
              key={item.machineId}
              type="button"
              onClick={() => handleSelectMachine(item.machineId)}
              className="text-left"
            >
              <Card className="group cursor-pointer border border-border hover:border-primary/40 hover:shadow-md transition-all duration-200">
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0">
                    <Dumbbell className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground">{item.machineName}</h4>
                    <p className="text-xs text-muted-foreground">{translateMuscleGroups(item.muscles)}</p>
                  </div>
                  {isSeen ? (
                    <Badge className="bg-primary/10 text-primary border-0 text-xs shrink-0">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Visto
                    </Badge>
                  ) : (
                    <Badge className="bg-accent/15 text-accent border-0 text-xs shrink-0">
                      <Clock className="w-3 h-3 mr-1" />
                      Pendiente
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </button>
          )
        })}
      </div>
    </div>
  )
}
