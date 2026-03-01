"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import {
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  Calendar,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface Tutorial {
  id: string
  machineId: string
  machineName: string
  title: string
  content: string | null
  videoUrl: string | null
  difficultyLevel: number | null
  durationMinutes: number | null
  steps: string[]
  orderIndex: number
  isActive: boolean
  status: "active" | "inactive"
  createdAt: string | null
}

interface MachineOption {
  id: string
  name: string
}

interface TutorialListResponse {
  tutorials: Tutorial[]
  machines: MachineOption[]
}

interface TutorialForm {
  machineId: string
  title: string
  content: string
  stepsText: string
  videoUrl: string
  status: "active" | "inactive"
}

const EMPTY_FORM: TutorialForm = {
  machineId: "",
  title: "",
  content: "",
  stepsText: "",
  videoUrl: "",
  status: "active",
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" })
}

function toStepsText(steps: string[]) {
  return steps.join("\n")
}

function toStepsArray(stepsText: string) {
  return stepsText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

export default function ContentPage() {
  const [tutorials, setTutorials] = useState<Tutorial[]>([])
  const [machines, setMachines] = useState<MachineOption[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("todos")
  const [machineFilter, setMachineFilter] = useState<string>("todos")

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<TutorialForm>(EMPTY_FORM)
  const [createSaving, setCreateSaving] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<TutorialForm>(EMPTY_FORM)
  const [editSaving, setEditSaving] = useState(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadTutorials = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set("search", search.trim())
      if (statusFilter !== "todos") params.set("status", statusFilter)
      if (machineFilter !== "todos") params.set("machine_id", machineFilter)

      const qs = params.toString()
      const res = await fetch(`/api/admin/tutorials${qs ? `?${qs}` : ""}`)
      if (!res.ok) return

      const data = (await res.json()) as TutorialListResponse
      setTutorials(data.tutorials ?? [])
      setMachines(data.machines ?? [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, machineFilter])

  useEffect(() => {
    loadTutorials()
  }, [loadTutorials])

  const activeCount = useMemo(
    () => tutorials.filter((tutorial) => tutorial.isActive).length,
    [tutorials]
  )

  function openCreate() {
    setCreateForm(EMPTY_FORM)
    setCreateOpen(true)
  }

  async function handleCreate() {
    if (!createForm.machineId || !createForm.title.trim()) return
    setCreateSaving(true)
    try {
      const res = await fetch("/api/admin/tutorials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machineId: createForm.machineId,
          title: createForm.title,
          content: createForm.content || undefined,
          steps: toStepsArray(createForm.stepsText),
          videoUrl: createForm.videoUrl || undefined,
          isActive: createForm.status === "active",
        }),
      })
      if (!res.ok) return

      setCreateOpen(false)
      await loadTutorials()
    } catch {
      // silently fail
    } finally {
      setCreateSaving(false)
    }
  }

  function openEdit(tutorial: Tutorial) {
    setEditId(tutorial.id)
    setEditForm({
      machineId: tutorial.machineId,
      title: tutorial.title,
      content: tutorial.content ?? "",
      stepsText: toStepsText(tutorial.steps),
      videoUrl: tutorial.videoUrl ?? "",
      status: tutorial.isActive ? "active" : "inactive",
    })
    setEditOpen(true)
  }

  async function handleEdit() {
    if (!editId || !editForm.machineId || !editForm.title.trim()) return
    setEditSaving(true)
    try {
      const res = await fetch(`/api/admin/tutorials/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machineId: editForm.machineId,
          title: editForm.title,
          content: editForm.content || undefined,
          steps: toStepsArray(editForm.stepsText),
          videoUrl: editForm.videoUrl || undefined,
          isActive: editForm.status === "active",
        }),
      })
      if (!res.ok) return

      setEditOpen(false)
      await loadTutorials()
    } catch {
      // silently fail
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDelete(tutorial: Tutorial) {
    const confirmed = window.confirm(`¿Eliminar tutorial "${tutorial.title}"?`)
    if (!confirmed) return
    setDeletingId(tutorial.id)
    try {
      const res = await fetch(`/api/admin/tutorials/${tutorial.id}`, { method: "DELETE" })
      if (!res.ok) return
      await loadTutorials()
    } catch {
      // silently fail
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">Contenido</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión de tutoriales por máquina
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo tutorial
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border border-border">
              <CardContent className="py-4 flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-5 w-8" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="border border-border">
              <CardContent className="py-4 flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted/30 shrink-0">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{tutorials.length}</p>
                  <p className="text-xs text-muted-foreground">Filtrados</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="py-4 flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-success/10 shrink-0">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{activeCount}</p>
                  <p className="text-xs text-muted-foreground">Activos</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="py-4 flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-destructive/10 shrink-0">
                  <XCircle className="w-4 h-4 text-destructive" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{tutorials.length - activeCount}</p>
                  <p className="text-xs text-muted-foreground">Inactivos</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="py-4 flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{machines.length}</p>
                  <p className="text-xs text-muted-foreground">Máquinas</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título o contenido..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={machineFilter} onValueChange={setMachineFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas las máquinas</SelectItem>
            {machines.map((machine) => (
              <SelectItem key={machine.id} value={machine.id}>{machine.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border border-border">
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-28 mt-1" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-8 flex-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tutorials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <BookOpen className="w-10 h-10 mb-2 opacity-40" />
          <p className="text-sm">No hay tutoriales para los filtros seleccionados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tutorials.map((tutorial) => (
            <Card key={tutorial.id} className="border border-border hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-semibold text-foreground">{tutorial.title}</CardTitle>
                  <Badge className={tutorial.isActive ? "bg-success/10 text-success border-0" : "bg-muted/20 text-muted-foreground border-0"}>
                    {tutorial.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{tutorial.machineName}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground line-clamp-2">{tutorial.content || "Sin contenido"}</p>
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  <span>{tutorial.steps.length} pasos</span>
                  <span>{formatDate(tutorial.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => openEdit(tutorial)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(tutorial)}
                    disabled={deletingId === tutorial.id}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {deletingId === tutorial.id ? "Eliminando..." : "Eliminar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) setCreateOpen(false)
        }}
      >
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Nuevo Tutorial</SheetTitle>
          </SheetHeader>
          <div className="mt-6 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label>Máquina</Label>
              <Select
                value={createForm.machineId}
                onValueChange={(value) => setCreateForm((prev) => ({ ...prev, machineId: value }))}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar máquina" /></SelectTrigger>
                <SelectContent>
                  {machines.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>{machine.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Título</Label>
              <Input
                value={createForm.title}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="ej. Técnica correcta en polea"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Contenido</Label>
              <Textarea
                value={createForm.content}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, content: e.target.value }))}
                rows={4}
                placeholder="Descripción del tutorial..."
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Pasos (uno por línea)</Label>
              <Textarea
                value={createForm.stepsText}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, stepsText: e.target.value }))}
                rows={6}
                placeholder="Paso 1..."
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Video URL</Label>
              <Input
                value={createForm.videoUrl}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, videoUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Estado</Label>
              <Select
                value={createForm.status}
                onValueChange={(value: "active" | "inactive") => setCreateForm((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <Button
              className="w-full gap-2"
              onClick={handleCreate}
              disabled={!createForm.machineId || !createForm.title.trim() || createSaving}
            >
              <Plus className="w-4 h-4" />
              {createSaving ? "Creando..." : "Crear tutorial"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={editOpen}
        onOpenChange={(open) => {
          if (!open) setEditOpen(false)
        }}
      >
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar Tutorial</SheetTitle>
          </SheetHeader>
          <div className="mt-6 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label>Máquina</Label>
              <Select
                value={editForm.machineId}
                onValueChange={(value) => setEditForm((prev) => ({ ...prev, machineId: value }))}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar máquina" /></SelectTrigger>
                <SelectContent>
                  {machines.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>{machine.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Título</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Contenido</Label>
              <Textarea
                value={editForm.content}
                onChange={(e) => setEditForm((prev) => ({ ...prev, content: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Pasos (uno por línea)</Label>
              <Textarea
                value={editForm.stepsText}
                onChange={(e) => setEditForm((prev) => ({ ...prev, stepsText: e.target.value }))}
                rows={6}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Video URL</Label>
              <Input
                value={editForm.videoUrl}
                onChange={(e) => setEditForm((prev) => ({ ...prev, videoUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Estado</Label>
              <Select
                value={editForm.status}
                onValueChange={(value: "active" | "inactive") => setEditForm((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <Button
              className="w-full gap-2"
              onClick={handleEdit}
              disabled={!editId || !editForm.machineId || !editForm.title.trim() || editSaving}
            >
              <CheckCircle className="w-4 h-4" />
              {editSaving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
