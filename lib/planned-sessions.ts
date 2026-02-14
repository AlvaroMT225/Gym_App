export type PlannedSessionStatus = "DRAFT" | "PROPOSED"

export interface PlannedSessionItem {
  exerciseId: string
  sets: number
  reps: number
  restSec: number
  targetRpe?: number
  notes?: string
}

export interface PlannedSession {
  id: string
  clientId: string
  trainerId: string
  title: string
  description?: string
  scheduledAt: string | null
  items: PlannedSessionItem[]
  status: PlannedSessionStatus
  version: number
  changelog: string[]
  createdAt: string
  updatedAt: string
}

const plannedSessionsStore: PlannedSession[] = [
  {
    id: "ps-1",
    clientId: "demo-user",
    trainerId: "demo-trainer",
    title: "Sesión de piernas - fuerza",
    description: "Enfoque en sentadilla y accesorios",
    scheduledAt: "2026-02-15T10:00:00",
    items: [
      { exerciseId: "ex-sentadilla", sets: 4, reps: 6, restSec: 180, targetRpe: 8 },
      { exerciseId: "ex-cuadriceps", sets: 3, reps: 12, restSec: 90, targetRpe: 7 },
    ],
    status: "PROPOSED",
    version: 1,
    changelog: ["Versión inicial"],
    createdAt: "2026-02-10T09:00:00",
    updatedAt: "2026-02-10T09:00:00",
  },
]

export function listPlannedSessionsForClient(clientId: string): PlannedSession[] {
  return plannedSessionsStore
    .filter((ps) => ps.clientId === clientId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export function getPlannedSessionById(id: string): PlannedSession | undefined {
  return plannedSessionsStore.find((ps) => ps.id === id)
}

export function createPlannedSession(input: {
  clientId: string
  trainerId: string
  title: string
  description?: string
  scheduledAt: string | null
  items: PlannedSessionItem[]
  status: PlannedSessionStatus
  changelog: string[]
}): PlannedSession {
  const now = new Date().toISOString()
  const session: PlannedSession = {
    id: `ps-${Date.now()}`,
    clientId: input.clientId,
    trainerId: input.trainerId,
    title: input.title,
    description: input.description,
    scheduledAt: input.scheduledAt,
    items: input.items,
    status: input.status,
    version: 1,
    changelog: input.changelog,
    createdAt: now,
    updatedAt: now,
  }
  plannedSessionsStore.unshift(session)
  return { ...session }
}

export function updatePlannedSession(input: {
  id: string
  title?: string
  description?: string
  scheduledAt?: string | null
  items?: PlannedSessionItem[]
  status?: PlannedSessionStatus
  changelogEntry: string
}): PlannedSession | null {
  const idx = plannedSessionsStore.findIndex((ps) => ps.id === input.id)
  if (idx === -1) return null

  const current = plannedSessionsStore[idx]
  const updated: PlannedSession = {
    ...current,
    title: input.title ?? current.title,
    description: input.description !== undefined ? input.description : current.description,
    scheduledAt: input.scheduledAt !== undefined ? input.scheduledAt : current.scheduledAt,
    items: input.items ?? current.items,
    status: input.status ?? current.status,
    version: current.version + 1,
    changelog: [...current.changelog, input.changelogEntry],
    updatedAt: new Date().toISOString(),
  }

  plannedSessionsStore[idx] = updated
  return { ...updated }
}

export function deletePlannedSession(id: string): boolean {
  const idx = plannedSessionsStore.findIndex((ps) => ps.id === id)
  if (idx === -1) return false
  plannedSessionsStore.splice(idx, 1)
  return true
}
