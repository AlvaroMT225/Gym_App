// ============================================================
// Minthy Training — Mock Data (v1 demo)
// ============================================================

export interface Machine {
  id: string
  name: string
  category: string
  muscles: string[]
  image: string
}

export interface SetRecord {
  id: string
  machineId: string
  userId: string
  weight: number
  reps: number
  rpe: number
  notes: string
  date: string
  viaQR: boolean
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlocked: boolean
  date?: string
}

export interface Challenge {
  id: string
  title: string
  description: string
  progress: number
  goal: number
  unit: string
  endsAt: string
  active: boolean
}

export interface Promo {
  id: string
  title: string
  description: string
  validUntil: string
  code?: string
}

export interface PaymentInfo {
  plan: string
  nextPayment: string
  status: "al_dia" | "por_vencer" | "vencido"
  history: { date: string; amount: number; status: string }[]
}

export interface UserProfile {
  id: string
  name: string
  email: string
  avatar: string
  scanStreak: number
  totalPoints: number
  memberSince: string
  payment: PaymentInfo
  planType: "BASIC" | "PREMIUM" | "COACHING"
  coachStatus?: "ACTIVE" | "INACTIVE" | "NONE"
  coachId?: string
}

// ── Rutinas y Sesiones ────────────────────────────────────────

export interface Routine {
  id: string
  name: string
  description: string
  source: "libre" | "entrenador"
  trainerId?: string
  machines: {
    machineId: string
    machineName: string
    targetSets: number
    targetReps: string
    restSeconds: number
    notes: string
  }[]
  createdAt: string
  updatedAt: string
}

export interface WorkoutSession {
  id: string
  routineId?: string
  routineName?: string
  type: "rutina" | "libre"
  date: string
  duration: number
  machineCount: number
  setCount: number
  totalVolume: number
  status: "completada" | "en_progreso"
}

export interface CoachInfo {
  id: string
  name: string
  avatar: string
  email: string
  phone: string
  specialty: string
  availability: { day: string; hours: string }[]
}

export interface GymSchedule {
  day: string
  open: string
  close: string
}

// ── Machines ──────────────────────────────────────────────────
export const machines: Machine[] = [
  {
    id: "SMITH-01",
    name: "Smith (Multifuncional)",
    category: "Multifuncional",
    muscles: ["Pecho", "Hombros", "Piernas", "Espalda"],
    image: "/machines/smith.jpg",
  },
  {
    id: "POLEA-01",
    name: "Polea Alta/Baja - Remo",
    category: "Espalda",
    muscles: ["Espalda", "Biceps"],
    image: "/machines/polea.jpg",
  },
  {
    id: "APERT-01",
    name: "Aperturas y Deltoides",
    category: "Pecho",
    muscles: ["Pecho", "Deltoides"],
    image: "/machines/aperturas.jpg",
  },
  {
    id: "ABDUC-01",
    name: "Abductor",
    category: "Piernas",
    muscles: ["Abductores", "Gluteos"],
    image: "/machines/abductor.jpg",
  },
  {
    id: "CUADR-01",
    name: "Extension de Cuadriceps",
    category: "Piernas",
    muscles: ["Cuadriceps"],
    image: "/machines/cuadriceps.jpg",
  },
  {
    id: "FEMOR-01",
    name: "Extension de Femorales",
    category: "Piernas",
    muscles: ["Femorales", "Gluteos"],
    image: "/machines/femorales.jpg",
  },
]

// ── History / Sets ────────────────────────────────────────────
export const setHistory: SetRecord[] = [
  { id: "s1", machineId: "SMITH-01", userId: "u1", weight: 60, reps: 10, rpe: 7, notes: "Sentadilla profunda", date: "2026-02-09T10:30:00", viaQR: true },
  { id: "s2", machineId: "SMITH-01", userId: "u1", weight: 70, reps: 8, rpe: 8, notes: "", date: "2026-02-09T10:35:00", viaQR: true },
  { id: "s3", machineId: "SMITH-01", userId: "u1", weight: 80, reps: 6, rpe: 9, notes: "PR!", date: "2026-02-07T09:15:00", viaQR: true },
  { id: "s4", machineId: "POLEA-01", userId: "u1", weight: 45, reps: 12, rpe: 6, notes: "Agarre estrecho", date: "2026-02-08T11:00:00", viaQR: true },
  { id: "s5", machineId: "POLEA-01", userId: "u1", weight: 50, reps: 10, rpe: 7, notes: "", date: "2026-02-08T11:05:00", viaQR: true },
  { id: "s6", machineId: "APERT-01", userId: "u1", weight: 30, reps: 15, rpe: 6, notes: "Control en excentrica", date: "2026-02-06T10:00:00", viaQR: false },
  { id: "s7", machineId: "ABDUC-01", userId: "u1", weight: 40, reps: 15, rpe: 5, notes: "", date: "2026-02-05T09:30:00", viaQR: true },
  { id: "s8", machineId: "CUADR-01", userId: "u1", weight: 55, reps: 12, rpe: 7, notes: "Buena conexion", date: "2026-02-04T10:20:00", viaQR: true },
  { id: "s9", machineId: "FEMOR-01", userId: "u1", weight: 35, reps: 12, rpe: 6, notes: "", date: "2026-02-03T10:50:00", viaQR: true },
  { id: "s10", machineId: "SMITH-01", userId: "u1", weight: 75, reps: 8, rpe: 8, notes: "Press banca", date: "2026-02-01T09:00:00", viaQR: true },
]

// ── Achievements ──────────────────────────────────────────────
export const achievements: Achievement[] = [
  { id: "a1", title: "Primera sesion", description: "Completa tu primer entrenamiento", icon: "Zap", unlocked: true, date: "2026-01-15" },
  { id: "a2", title: "Racha de 7 dias", description: "Escanea QR 7 dias consecutivos", icon: "Flame", unlocked: true, date: "2026-01-22" },
  { id: "a3", title: "100 kg Club", description: "Levanta 100 kg en cualquier maquina", icon: "Trophy", unlocked: false },
  { id: "a4", title: "Escanea 50 QR", description: "Escanea 50 codigos QR en total", icon: "QrCode", unlocked: false },
  { id: "a5", title: "Maquina Dominada", description: "Registra 20 sesiones en la misma maquina", icon: "Target", unlocked: false },
  { id: "a6", title: "Constancia de hierro", description: "30 dias consecutivos de racha", icon: "Shield", unlocked: false },
]

// ── Challenges ────────────────────────────────────────────────
export const challenges: Challenge[] = [
  { id: "c1", title: "Semana de Piernas", description: "Completa 10 sets de piernas esta semana", progress: 6, goal: 10, unit: "sets", endsAt: "2026-02-14", active: true },
  { id: "c2", title: "Volumen Total", description: "Acumula 5,000 kg de volumen esta semana", progress: 3200, goal: 5000, unit: "kg", endsAt: "2026-02-14", active: true },
  { id: "c3", title: "Escaneo Perfecto", description: "Escanea QR todos los dias de la semana", progress: 4, goal: 7, unit: "dias", endsAt: "2026-02-14", active: true },
]

// ── Rankings ──────────────────────────────────────────────────
export const rankings = [
  { rank: 1, name: "Carlos M.", points: 2450, avatar: "CM" },
  { rank: 2, name: "Tu", points: 1890, avatar: "TU", isUser: true },
  { rank: 3, name: "Ana R.", points: 1750, avatar: "AR" },
  { rank: 4, name: "Luis P.", points: 1620, avatar: "LP" },
  { rank: 5, name: "Maria G.", points: 1480, avatar: "MG" },
]

// ── Promos ────────────────────────────────────────────────────
export const promos: Promo[] = [
  { id: "p1", title: "20% en Suplementos", description: "Valido en la tienda del gym. Presenta tu codigo al momento de pagar.", validUntil: "2026-02-28", code: "MINTHY20" },
  { id: "p2", title: "Clase Gratis de Spinning", description: "Inscribete en la proxima clase de spinning sin costo adicional.", validUntil: "2026-02-20" },
  { id: "p3", title: "Trae un amigo", description: "Tu amigo entrena gratis 1 semana y tu ganas 200 puntos extra.", validUntil: "2026-03-15" },
]

// ── Current User ──────────────────────────────────────────────
export const currentUser: UserProfile = {
  id: "u1",
  name: "Alex Trainer",
  email: "alex@minthy.app",
  avatar: "AT",
  scanStreak: 4,
  totalPoints: 1890,
  memberSince: "2026-01-10",
  payment: {
    plan: "Mensual",
    nextPayment: "2026-02-15",
    status: "por_vencer",
    history: [
      { date: "2026-01-10", amount: 45, status: "pagado" },
      { date: "2025-12-10", amount: 45, status: "pagado" },
      { date: "2025-11-10", amount: 45, status: "pagado" },
    ],
  },
  planType: "COACHING",
  coachStatus: "ACTIVE",
  coachId: "trainer-1",
}

// ── Gym Admin View (demo) ─────────────────────────────────────
export const gymMembers = [
  { id: "u1", name: "Alex Trainer", plan: "Mensual", nextPayment: "2026-02-15", status: "por_vencer" as const },
  { id: "u2", name: "Carlos M.", plan: "Trimestral", nextPayment: "2026-04-01", status: "al_dia" as const },
  { id: "u3", name: "Ana R.", plan: "Mensual", nextPayment: "2026-02-10", status: "vencido" as const },
  { id: "u4", name: "Luis P.", plan: "Semanal", nextPayment: "2026-02-12", status: "por_vencer" as const },
  { id: "u5", name: "Maria G.", plan: "Anual", nextPayment: "2026-12-01", status: "al_dia" as const },
]

// ── Tutorials ─────────────────────────────────────────────────
export const tutorials = machines.map((m) => ({
  machineId: m.id,
  machineName: m.name,
  steps: [
    "Ajusta el asiento a tu altura",
    "Selecciona el peso adecuado",
    "Mantiene la espalda recta durante el movimiento",
    "Realiza el movimiento completo y controlado",
    "Respira: exhala en la fase concentrica, inhala en la excentrica",
  ],
  safetyTips: [
    "No uses peso excesivo en tus primeras sesiones",
    "Si sientes dolor articular, detente inmediatamente",
    "Mantiene siempre la postura correcta",
    "Pide ayuda a un instructor si tienes dudas",
  ],
}))

// ── Horario del Gym ───────────────────────────────────────────
export const gymSchedule: GymSchedule[] = [
  { day: "Lunes", open: "06:00", close: "22:00" },
  { day: "Martes", open: "06:00", close: "22:00" },
  { day: "Miercoles", open: "06:00", close: "22:00" },
  { day: "Jueves", open: "06:00", close: "22:00" },
  { day: "Viernes", open: "06:00", close: "22:00" },
  { day: "Sabado", open: "07:00", close: "20:00" },
  { day: "Domingo", open: "08:00", close: "14:00" },
]

// ── Entrenador Asignado ───────────────────────────────────────
export const userCoach: CoachInfo = {
  id: "trainer-1",
  name: "Coach Maria",
  avatar: "CM",
  email: "trainer@minty.demo",
  phone: "+593 99 123 4567",
  specialty: "Fuerza e hipertrofia",
  availability: [
    { day: "Lunes a Viernes", hours: "08:00 - 12:00, 15:00 - 19:00" },
    { day: "Sabado", hours: "09:00 - 13:00" },
  ],
}

// ── Rutinas del Usuario ───────────────────────────────────────
export const userRoutines: Routine[] = [
  {
    id: "routine-1",
    name: "Tren Superior Fuerza",
    description: "Rutina enfocada en pecho, espalda y hombros",
    source: "libre",
    machines: [
      { machineId: "SMITH-01", machineName: "Smith (Multifuncional)", targetSets: 4, targetReps: "6-8", restSeconds: 120, notes: "Peso pesado" },
      { machineId: "POLEA-01", machineName: "Polea Alta/Baja - Remo", targetSets: 3, targetReps: "10-12", restSeconds: 90, notes: "" },
      { machineId: "APERT-01", machineName: "Aperturas y Deltoides", targetSets: 3, targetReps: "12-15", restSeconds: 60, notes: "Control en excentrica" },
    ],
    createdAt: "2026-01-15",
    updatedAt: "2026-02-01",
  },
  {
    id: "routine-2",
    name: "Piernas Completo",
    description: "Cuadriceps, femorales y gluteos",
    source: "libre",
    machines: [
      { machineId: "CUADR-01", machineName: "Extension de Cuadriceps", targetSets: 4, targetReps: "10-12", restSeconds: 90, notes: "" },
      { machineId: "FEMOR-01", machineName: "Extension de Femorales", targetSets: 4, targetReps: "10-12", restSeconds: 90, notes: "" },
      { machineId: "ABDUC-01", machineName: "Abductor", targetSets: 3, targetReps: "15-20", restSeconds: 60, notes: "" },
    ],
    createdAt: "2026-01-20",
    updatedAt: "2026-02-05",
  },
]

// ── Rutinas del Entrenador ────────────────────────────────────
export const coachRoutines: Routine[] = [
  {
    id: "routine-coach-1",
    name: "Plan Hipertrofia - Semana A",
    description: "Prescrito por Coach Maria - Enfoque en volumen",
    source: "entrenador",
    trainerId: "trainer-1",
    machines: [
      { machineId: "SMITH-01", machineName: "Smith (Multifuncional)", targetSets: 4, targetReps: "8-10", restSeconds: 90, notes: "RPE 7-8" },
      { machineId: "POLEA-01", machineName: "Polea Alta/Baja - Remo", targetSets: 4, targetReps: "10-12", restSeconds: 75, notes: "" },
      { machineId: "APERT-01", machineName: "Aperturas y Deltoides", targetSets: 3, targetReps: "12-15", restSeconds: 60, notes: "Squeeze al final" },
      { machineId: "CUADR-01", machineName: "Extension de Cuadriceps", targetSets: 3, targetReps: "12-15", restSeconds: 60, notes: "" },
    ],
    createdAt: "2026-02-01",
    updatedAt: "2026-02-10",
  },
]

// ── Historial de Sesiones ─────────────────────────────────────
export const workoutSessions: WorkoutSession[] = [
  { id: "session-1", routineId: "routine-1", routineName: "Tren Superior Fuerza", type: "rutina", date: "2026-02-09", duration: 52, machineCount: 3, setCount: 10, totalVolume: 8450, status: "completada" },
  { id: "session-2", routineId: undefined, routineName: undefined, type: "libre", date: "2026-02-08", duration: 35, machineCount: 2, setCount: 6, totalVolume: 4200, status: "completada" },
  { id: "session-3", routineId: "routine-2", routineName: "Piernas Completo", type: "rutina", date: "2026-02-06", duration: 48, machineCount: 3, setCount: 11, totalVolume: 7800, status: "completada" },
  { id: "session-4", routineId: "routine-coach-1", routineName: "Plan Hipertrofia - Semana A", type: "rutina", date: "2026-02-04", duration: 65, machineCount: 4, setCount: 14, totalVolume: 12300, status: "completada" },
  { id: "session-5", routineId: undefined, routineName: undefined, type: "libre", date: "2026-02-02", duration: 28, machineCount: 2, setCount: 5, totalVolume: 3100, status: "completada" },
]

// ── Helper ────────────────────────────────────────────────────
export function getMachineById(id: string) {
  return machines.find((m) => m.id === id)
}

export function getHistoryForMachine(machineId: string) {
  return setHistory
    .filter((s) => s.machineId === machineId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getPRForMachine(machineId: string) {
  const history = getHistoryForMachine(machineId)
  if (history.length === 0) return null
  return history.reduce((best, s) => (s.weight > best.weight ? s : best), history[0])
}
