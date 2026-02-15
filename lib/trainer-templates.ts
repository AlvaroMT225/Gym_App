export interface TemplateExercise {
  exerciseId: string
  sets: number
  reps: number
  restSec: number
  targetRpe?: number
  notes?: string
}

export interface TrainerTemplate {
  id: string
  trainerId: string
  title: string
  description: string
  type: "routine" | "session"
  exercises: TemplateExercise[]
  createdAt: string
  updatedAt: string
}

const templateStore: TrainerTemplate[] = [
  {
    id: "tpl-1",
    trainerId: "demo-trainer",
    title: "Full body principiante",
    description: "Rutina de adaptación para nuevos clientes",
    type: "routine",
    exercises: [
      { exerciseId: "ex-press-banca", sets: 3, reps: 12, restSec: 60 },
      { exerciseId: "ex-sentadilla", sets: 3, reps: 12, restSec: 60 },
      { exerciseId: "ex-remo", sets: 3, reps: 12, restSec: 60 },
    ],
    createdAt: "2026-01-15T10:00:00",
    updatedAt: "2026-01-15T10:00:00",
  },
  {
    id: "tpl-2",
    trainerId: "demo-trainer",
    title: "Sesión piernas fuerza",
    description: "Sesión enfocada en fuerza de tren inferior",
    type: "session",
    exercises: [
      { exerciseId: "ex-sentadilla", sets: 4, reps: 6, restSec: 180, targetRpe: 8 },
      { exerciseId: "ex-cuadriceps", sets: 3, reps: 10, restSec: 90, targetRpe: 7 },
      { exerciseId: "ex-femorales", sets: 3, reps: 10, restSec: 90, targetRpe: 7 },
    ],
    createdAt: "2026-01-20T14:00:00",
    updatedAt: "2026-01-20T14:00:00",
  },
  {
    id: "tpl-3",
    trainerId: "demo-trainer",
    title: "Upper body hipertrofia",
    description: "Rutina de tren superior con volumen moderado",
    type: "routine",
    exercises: [
      { exerciseId: "ex-press-banca", sets: 4, reps: 10, restSec: 75 },
      { exerciseId: "ex-aperturas", sets: 3, reps: 12, restSec: 60 },
      { exerciseId: "ex-remo", sets: 4, reps: 10, restSec: 75 },
    ],
    createdAt: "2026-02-01T09:00:00",
    updatedAt: "2026-02-01T09:00:00",
  },
]

export function listTemplates(trainerId: string): TrainerTemplate[] {
  return templateStore
    .filter((t) => t.trainerId === trainerId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export function getTemplateById(id: string): TrainerTemplate | undefined {
  return templateStore.find((t) => t.id === id)
}

export function createTemplate(input: {
  trainerId: string
  title: string
  description: string
  type: "routine" | "session"
  exercises: TemplateExercise[]
}): TrainerTemplate {
  const now = new Date().toISOString()
  const template: TrainerTemplate = {
    id: `tpl-${Date.now()}`,
    trainerId: input.trainerId,
    title: input.title,
    description: input.description,
    type: input.type,
    exercises: input.exercises,
    createdAt: now,
    updatedAt: now,
  }
  templateStore.unshift(template)
  return { ...template }
}

export function updateTemplate(
  id: string,
  input: {
    title?: string
    description?: string
    type?: "routine" | "session"
    exercises?: TemplateExercise[]
  }
): TrainerTemplate | null {
  const idx = templateStore.findIndex((t) => t.id === id)
  if (idx === -1) return null

  const current = templateStore[idx]
  const updated: TrainerTemplate = {
    ...current,
    title: input.title ?? current.title,
    description: input.description ?? current.description,
    type: input.type ?? current.type,
    exercises: input.exercises ?? current.exercises,
    updatedAt: new Date().toISOString(),
  }
  templateStore[idx] = updated
  return { ...updated }
}

export function deleteTemplate(id: string): boolean {
  const idx = templateStore.findIndex((t) => t.id === id)
  if (idx === -1) return false
  templateStore.splice(idx, 1)
  return true
}

export function duplicateTemplate(id: string): TrainerTemplate | null {
  const original = templateStore.find((t) => t.id === id)
  if (!original) return null

  const now = new Date().toISOString()
  const duplicate: TrainerTemplate = {
    ...original,
    id: `tpl-${Date.now()}`,
    title: `${original.title} (copia)`,
    createdAt: now,
    updatedAt: now,
  }
  templateStore.unshift(duplicate)
  return { ...duplicate }
}
