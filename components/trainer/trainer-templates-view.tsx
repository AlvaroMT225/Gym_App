"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  FolderOpen,
  Plus,
  PencilLine,
  Copy,
  Trash2,
  Dumbbell,
} from "lucide-react"

interface TemplateExercise {
  exerciseId: string
  exerciseName?: string
  sets: number
  reps: number
  restSec: number
  targetRpe?: number
}

interface Template {
  id: string
  title: string
  description: string
  type: "routine" | "session"
  exercises: TemplateExercise[]
  createdAt: string
  updatedAt: string
}

export function TrainerTemplatesView() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [isNew, setIsNew] = useState(false)

  const fetchTemplates = () => {
    fetch("/api/trainer/templates")
      .then((r) => (r.ok ? r.json() : { templates: [] }))
      .then((d) => setTemplates(d.templates || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchTemplates() }, [])

  const routineTemplates = templates.filter((t) => t.type === "routine")
  const sessionTemplates = templates.filter((t) => t.type === "session")

  const handleCreate = (type: "routine" | "session") => {
    setEditingTemplate({
      id: "",
      title: "",
      description: "",
      type,
      exercises: [],
      createdAt: "",
      updatedAt: "",
    })
    setIsNew(true)
  }

  const handleSave = async () => {
    if (!editingTemplate) return

    const body = {
      title: editingTemplate.title,
      description: editingTemplate.description,
      type: editingTemplate.type,
      exercises: editingTemplate.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        sets: e.sets,
        reps: e.reps,
        restSec: e.restSec,
        targetRpe: e.targetRpe,
      })),
    }

    if (isNew) {
      await fetch("/api/trainer/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    } else {
      await fetch(`/api/trainer/templates/${editingTemplate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    }

    setEditingTemplate(null)
    setIsNew(false)
    fetchTemplates()
  }

  const handleDuplicate = async (id: string) => {
    await fetch(`/api/trainer/templates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "duplicate" }),
    })
    fetchTemplates()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/trainer/templates/${id}`, { method: "DELETE" })
    fetchTemplates()
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <h1 className="text-xl font-bold text-foreground">Plantillas</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h1 className="text-xl font-bold text-foreground">Plantillas</h1>

      <Tabs defaultValue="routines" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="routines" className="text-xs">
            Rutinas ({routineTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="sessions" className="text-xs">
            Sesiones ({sessionTemplates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="routines" className="mt-3 space-y-3">
          <Button size="sm" onClick={() => handleCreate("routine")} className="w-full">
            <Plus className="w-4 h-4 mr-1" /> Nueva plantilla de rutina
          </Button>
          <TemplateList
            templates={routineTemplates}
            onEdit={(t) => { setEditingTemplate(t); setIsNew(false) }}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="sessions" className="mt-3 space-y-3">
          <Button size="sm" onClick={() => handleCreate("session")} className="w-full">
            <Plus className="w-4 h-4 mr-1" /> Nueva plantilla de sesión
          </Button>
          <TemplateList
            templates={sessionTemplates}
            onEdit={(t) => { setEditingTemplate(t); setIsNew(false) }}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        </TabsContent>
      </Tabs>

      {/* Edit/Create Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => { if (!open) { setEditingTemplate(null); setIsNew(false) } }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? "Nueva plantilla" : "Editar plantilla"}</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Título</Label>
                <Input
                  value={editingTemplate.title}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                  placeholder="Nombre de la plantilla"
                />
              </div>
              <div>
                <Label className="text-xs">Descripción</Label>
                <Input
                  value={editingTemplate.description}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  placeholder="Descripción breve"
                />
              </div>
              <div>
                <Label className="text-xs mb-2 block">Ejercicios ({editingTemplate.exercises.length})</Label>
                {editingTemplate.exercises.map((ex, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2 text-xs">
                    <span className="flex-1 truncate">{ex.exerciseName || ex.exerciseId}</span>
                    <span>{ex.sets}x{ex.reps}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        const updated = editingTemplate.exercises.filter((_, i) => i !== idx)
                        setEditingTemplate({ ...editingTemplate, exercises: updated })
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => {
                    setEditingTemplate({
                      ...editingTemplate,
                      exercises: [
                        ...editingTemplate.exercises,
                        { exerciseId: "ex-press-banca", exerciseName: "Press de banca", sets: 3, reps: 10, restSec: 60 },
                      ],
                    })
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" /> Agregar ejercicio
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingTemplate(null); setIsNew(false) }}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!editingTemplate?.title}>
              {isNew ? "Crear" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TemplateList({
  templates,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  templates: Template[]
  onEdit: (t: Template) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}) {
  if (templates.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
        No hay plantillas aún
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {templates.map((t) => (
        <Card key={t.id} className="border border-border">
          <CardContent className="p-3">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h4 className="text-sm font-semibold text-foreground">{t.title}</h4>
                <p className="text-xs text-muted-foreground">{t.description}</p>
              </div>
              <Badge variant="secondary" className="text-[10px] shrink-0">
                <Dumbbell className="w-3 h-3 mr-1" />
                {t.exercises.length} ejercicios
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {t.exercises.slice(0, 3).map((ex, idx) => (
                <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                  {ex.exerciseName || ex.exerciseId}
                </span>
              ))}
              {t.exercises.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{t.exercises.length - 3} más</span>
              )}
            </div>
            <div className="flex gap-1 mt-2">
              <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => onEdit(t)}>
                <PencilLine className="w-3 h-3 mr-1" /> Editar
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => onDuplicate(t.id)}>
                <Copy className="w-3 h-3 mr-1" /> Duplicar
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs px-2 text-destructive hover:text-destructive" onClick={() => onDelete(t.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
