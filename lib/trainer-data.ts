import type { ConsentScope } from "@/lib/consents"

export interface TrainerProfile {
  id: string
  name: string
  email: string
  avatar: string
}

export interface ClientProfile {
  id: string
  name: string
  alias: string
  avatar: string
  memberSince: string
  goal: string
}

export interface ExerciseCatalogItem {
  id: string
  name: string
  muscles: string[]
  category: string
  machine: string
  description: string
}

export interface TrainerSessionSet {
  weight: number
  reps: number
  rpe: number
  notes?: string
}

export interface TrainerSession {
  id: string
  clientId: string
  date: string
  exerciseId: string
  sets: TrainerSessionSet[]
  source: "qr" | "manual"
}

export interface RoutineExercise {
  id: string
  name: string
  sets: number
  reps: number
  restSec: number
  notes?: string
}

export interface RoutinePlan {
  id: string
  title: string
  updatedAt: string
  weeks: number
  progression: string
  exercises: RoutineExercise[]
  version: number
  changelog: string[]
  status: "active" | "proposal" | "accepted" | "rejected"
}

export interface SessionComment {
  id: string
  sessionId: string
  clientId: string
  trainerId: string
  comment: string
  createdAt: string
}

export interface ClientAchievement {
  id: string
  title: string
  description: string
  unlocked: boolean
  date?: string
}

export interface ClientPR {
  exerciseId: string
  bestWeight: number
  date: string
}

export const trainers: TrainerProfile[] = [
  {
    id: "trainer-1",
    name: "Coach Maria",
    email: "trainer@minty.demo",
    avatar: "CM",
  },
  {
    id: "trainer-2",
    name: "Coach Pedro",
    email: "pedro@minty.demo",
    avatar: "CP",
  },
  {
    id: "trainer-3",
    name: "Coach Laura",
    email: "laura@minty.demo",
    avatar: "CL",
  },
]

export const clients: ClientProfile[] = [
  {
    id: "demo-user",
    name: "Alex Trainer",
    alias: "Alex T.",
    avatar: "AT",
    memberSince: "2026-01-10",
    goal: "Ganar fuerza y mejorar tecnica",
  },
  {
    id: "client-ana",
    name: "Ana Ruiz",
    alias: "Ana R.",
    avatar: "AR",
    memberSince: "2025-12-01",
    goal: "Tonificacion general y resistencia",
  },
  {
    id: "client-luis",
    name: "Luis Perez",
    alias: "Luis P.",
    avatar: "LP",
    memberSince: "2025-11-15",
    goal: "Mejorar PRs en fuerza maxima",
  },
]

export const exerciseCatalog: ExerciseCatalogItem[] = [
  {
    id: "ex-press-banca",
    name: "Press de banca",
    muscles: ["Pecho", "Triceps"],
    category: "Pecho",
    machine: "Smith (Multifuncional)",
    description: "Press en banco con enfasis en pecho y estabilidad.",
  },
  {
    id: "ex-sentadilla",
    name: "Sentadilla en Smith",
    muscles: ["Piernas", "Gluteos"],
    category: "Piernas",
    machine: "Smith (Multifuncional)",
    description: "Sentadilla controlada con soporte de guia.",
  },
  {
    id: "ex-remo",
    name: "Remo en polea",
    muscles: ["Espalda", "Biceps"],
    category: "Espalda",
    machine: "Polea Alta/Baja - Remo",
    description: "Remo con agarre neutro para espalda media.",
  },
  {
    id: "ex-aperturas",
    name: "Aperturas con maquina",
    muscles: ["Pecho", "Hombros"],
    category: "Pecho",
    machine: "Aperturas y Deltoides",
    description: "Aperturas controladas para trabajar fibras medias.",
  },
  {
    id: "ex-cuadriceps",
    name: "Extension de cuadriceps",
    muscles: ["Cuadriceps"],
    category: "Piernas",
    machine: "Extension de Cuadriceps",
    description: "Aislamiento de cuadriceps con tempo 3-1-2.",
  },
  {
    id: "ex-femorales",
    name: "Extension de femorales",
    muscles: ["Femorales", "Gluteos"],
    category: "Piernas",
    machine: "Extension de Femorales",
    description: "Extension controlada para femorales.",
  },
]

export const trainerSessions: TrainerSession[] = [
  {
    id: "ts-1",
    clientId: "demo-user",
    date: "2026-02-09T10:30:00",
    exerciseId: "ex-sentadilla",
    sets: [
      { weight: 60, reps: 10, rpe: 7, notes: "Profundidad completa" },
      { weight: 70, reps: 8, rpe: 8 },
      { weight: 80, reps: 6, rpe: 9, notes: "PR tecnico" },
    ],
    source: "qr",
  },
  {
    id: "ts-2",
    clientId: "demo-user",
    date: "2026-02-08T11:00:00",
    exerciseId: "ex-remo",
    sets: [
      { weight: 45, reps: 12, rpe: 6 },
      { weight: 50, reps: 10, rpe: 7 },
    ],
    source: "qr",
  },
  {
    id: "ts-3",
    clientId: "demo-user",
    date: "2026-02-06T10:00:00",
    exerciseId: "ex-aperturas",
    sets: [{ weight: 30, reps: 15, rpe: 6, notes: "Control lento" }],
    source: "manual",
  },
  {
    id: "ts-4",
    clientId: "demo-user",
    date: "2026-02-04T10:20:00",
    exerciseId: "ex-cuadriceps",
    sets: [
      { weight: 55, reps: 12, rpe: 7 },
      { weight: 60, reps: 10, rpe: 8 },
    ],
    source: "qr",
  },
  {
    id: "ts-5",
    clientId: "client-ana",
    date: "2026-02-07T09:10:00",
    exerciseId: "ex-press-banca",
    sets: [
      { weight: 30, reps: 12, rpe: 6 },
      { weight: 35, reps: 10, rpe: 7 },
    ],
    source: "qr",
  },
  {
    id: "ts-6",
    clientId: "client-luis",
    date: "2026-02-05T08:40:00",
    exerciseId: "ex-sentadilla",
    sets: [
      { weight: 90, reps: 6, rpe: 8 },
      { weight: 100, reps: 4, rpe: 9 },
    ],
    source: "qr",
  },
]

export const routineActive: Record<string, RoutinePlan> = {
  "demo-user": {
    id: "r-active-1",
    title: "Fuerza base 4 semanas",
    updatedAt: "2026-02-01",
    weeks: 4,
    progression: "Incremento de carga +2.5kg cada semana en compuestos.",
    exercises: [
      { id: "ex-sentadilla", name: "Sentadilla en Smith", sets: 4, reps: 8, restSec: 90 },
      { id: "ex-press-banca", name: "Press de banca", sets: 4, reps: 8, restSec: 90 },
      { id: "ex-remo", name: "Remo en polea", sets: 3, reps: 10, restSec: 75 },
    ],
    version: 1,
    changelog: [],
    status: "active",
  },
  "client-ana": {
    id: "r-active-2",
    title: "Tonificacion full body",
    updatedAt: "2026-01-20",
    weeks: 6,
    progression: "Progresion por repeticiones +2 reps cada semana.",
    exercises: [
      { id: "ex-aperturas", name: "Aperturas con maquina", sets: 3, reps: 12, restSec: 60 },
      { id: "ex-remo", name: "Remo en polea", sets: 3, reps: 12, restSec: 60 },
      { id: "ex-cuadriceps", name: "Extension de cuadriceps", sets: 3, reps: 12, restSec: 60 },
    ],
    version: 1,
    changelog: [],
    status: "active",
  },
}

export const routineProposals: Record<string, RoutinePlan | null> = {
  "demo-user": {
    id: "r-prop-1",
    title: "Propuesta: fuerza + hipertrofia",
    updatedAt: "2026-02-08",
    weeks: 4,
    progression: "Subir 1-2 reps por semana en accesorios.",
    exercises: [
      { id: "ex-sentadilla", name: "Sentadilla en Smith", sets: 4, reps: 6, restSec: 120 },
      { id: "ex-press-banca", name: "Press de banca", sets: 4, reps: 6, restSec: 120 },
      { id: "ex-aperturas", name: "Aperturas con maquina", sets: 3, reps: 12, restSec: 60 },
    ],
    version: 2,
    changelog: ["Ajuste para mayor fuerza", "Aumento de descanso entre series"],
    status: "proposal",
  },
  "client-ana": null,
  "client-luis": null,
}

export const sessionComments: SessionComment[] = [
  {
    id: "sc-1",
    sessionId: "ts-1",
    clientId: "demo-user",
    trainerId: "demo-trainer",
    comment: "Buen trabajo. Sube 2.5kg en la proxima semana.",
    createdAt: "2026-02-10T09:00:00",
  },
]

export const clientAchievements: Record<string, ClientAchievement[]> = {
  "demo-user": [
    { id: "ach-1", title: "Primera sesion", description: "Completo primer entrenamiento", unlocked: true, date: "2026-01-15" },
    { id: "ach-2", title: "Racha 7 dias", description: "Entreno 7 dias seguidos", unlocked: true, date: "2026-01-22" },
    { id: "ach-3", title: "PR 80kg", description: "Nuevo PR en sentadilla", unlocked: false },
  ],
  "client-ana": [
    { id: "ach-4", title: "Constancia", description: "4 semanas continuas", unlocked: true, date: "2026-01-30" },
  ],
  "client-luis": [
    { id: "ach-5", title: "PR 100kg", description: "Nuevo PR en sentadilla", unlocked: true, date: "2026-02-05" },
  ],
}

export const clientGoals: Record<string, { label: string; scopesRequired: ConsentScope[] }[]> = {
  "demo-user": [{ label: "Subir PR en sentadilla", scopesRequired: ["goals:write"] }],
  "client-ana": [],
  "client-luis": [],
}

export function getClientById(clientId: string): ClientProfile | undefined {
  return clients.find((c) => c.id === clientId)
}

export function getTrainerById(trainerId: string): TrainerProfile | undefined {
  return trainers.find((t) => t.id === trainerId)
}

export function getExerciseById(exerciseId: string): ExerciseCatalogItem | undefined {
  return exerciseCatalog.find((e) => e.id === exerciseId)
}

export function listSessionsForClient(clientId: string): TrainerSession[] {
  return trainerSessions.filter((s) => s.clientId === clientId)
}

export function listCommentsForSession(sessionId: string): SessionComment[] {
  return sessionComments.filter((c) => c.sessionId === sessionId)
}

export function acceptProposal(clientId: string): RoutinePlan | null {
  const proposal = routineProposals[clientId]
  if (!proposal || proposal.status !== "proposal") return null

  // Move proposal to active, increment version
  const newActive: RoutinePlan = {
    ...proposal,
    id: `r-active-${Date.now()}`,
    status: "active",
    updatedAt: new Date().toISOString(),
  }

  routineActive[clientId] = newActive
  routineProposals[clientId] = null

  return newActive
}

export function rejectProposal(clientId: string): boolean {
  const proposal = routineProposals[clientId]
  if (!proposal || proposal.status !== "proposal") return false

  // Mark as rejected and clear
  proposal.status = "rejected"
  routineProposals[clientId] = null

  return true
}

