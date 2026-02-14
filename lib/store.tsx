"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type { SetRecord, Achievement, Challenge, Promo } from "@/lib/mock-data"
import {
  setHistory as initialSets,
  achievements as initialAchievements,
  challenges as initialChallenges,
  promos as initialPromos,
  currentUser as initialUser,
  rankings as initialRankings,
  gymMembers as initialGymMembers,
  tutorials as initialTutorials,
} from "@/lib/mock-data"

// ── Session (extends SetRecord with source) ───────────────────
export interface Session {
  id: string
  date: string
  machineId: string
  sets: {
    weight: number
    reps: number
    rpe: number
    timeSec?: number
    notes?: string
  }[]
  source: "qr" | "manual"
}

// ── Extended promo with status ────────────────────────────────
export interface PromoExtended extends Promo {
  status: "vigente" | "expirado"
  couponQR?: string
  terms?: string
  usedAt?: string
}

// ── Extended achievement with category/progress ───────────────
export interface AchievementExtended {
  id: string
  category: "racha" | "volumen" | "pr" | "constancia" | "retos"
  title: string
  description: string
  icon: string
  requirement: string
  progress: number
  goal: number
  unlocked: boolean
  unlockedAt?: string
}

// ── Payment user ──────────────────────────────────────────────
export interface PaymentUser {
  planPeriod: string
  nextDueDate: string
  status: "al dia" | "por vencer" | "vencido"
  history: { date: string; amount: number; method: string; status: string }[]
  alerts: { id: string; message: string; type: "warning" | "danger" | "info"; date: string }[]
}

// ── GymMember ─────────────────────────────────────────────────
export interface GymMember {
  id: string
  name: string
  plan: string
  nextPayment: string
  status: "al_dia" | "por_vencer" | "vencido"
  reminderSent?: boolean
}

// ── Notification ──────────────────────────────────────────────
export interface Notification {
  id: string
  title: string
  message: string
  type: "promo" | "payment" | "achievement" | "challenge" | "cta"
  read: boolean
  date: string
}

// ── Store State ───────────────────────────────────────────────
interface StoreState {
  // Sessions (converted from old setHistory + new)
  sessions: Session[]
  addSession: (session: Omit<Session, "id">) => void

  // Achievements
  achievements: AchievementExtended[]
  unlockAchievement: (id: string) => void

  // Challenges
  challenges: Challenge[]
  optedInRankings: boolean
  toggleRankingsOptIn: () => void

  // Promos
  promos: PromoExtended[]
  usePromo: (id: string) => void

  // Payments
  payment: PaymentUser
  gymMembers: GymMember[]
  markPaymentReceived: (memberId: string) => void
  sendReminder: (memberId: string) => void

  // Tutorials seen
  tutorialsSeen: Record<string, boolean>
  markTutorialSeen: (machineId: string) => void

  // User preferences
  weightUnit: "kg" | "lb"
  setWeightUnit: (unit: "kg" | "lb") => void

  // Notifications
  notifications: Notification[]
  markNotificationRead: (id: string) => void

  // Rankings
  rankings: typeof initialRankings

  // User
  user: typeof initialUser
  updateUser: (data: { name: string; email: string }) => void
}

// ── Convert legacy setHistory to sessions ─────────────────────
function convertLegacySets(): Session[] {
  const grouped: Record<string, typeof initialSets> = {}
  for (const s of initialSets) {
    const dayKey = `${s.machineId}-${s.date.split("T")[0]}`
    if (!grouped[dayKey]) grouped[dayKey] = []
    grouped[dayKey].push(s)
  }

  return Object.entries(grouped).map(([key, sets], i) => ({
    id: `session-${i + 1}`,
    date: sets[0].date,
    machineId: sets[0].machineId,
    sets: sets.map((s) => ({
      weight: s.weight,
      reps: s.reps,
      rpe: s.rpe,
      notes: s.notes || undefined,
    })),
    source: sets[0].viaQR ? ("qr" as const) : ("manual" as const),
  }))
}

// ── Build extended achievements ───────────────────────────────
function buildAchievements(): AchievementExtended[] {
  return [
    { id: "a1", category: "constancia", title: "Primera sesion", description: "Completa tu primer entrenamiento", icon: "Zap", requirement: "1 sesion completada", progress: 1, goal: 1, unlocked: true, unlockedAt: "2026-01-15" },
    { id: "a2", category: "racha", title: "Racha de 7 dias", description: "Escanea QR 7 dias consecutivos", icon: "Flame", requirement: "7 dias de racha QR", progress: 7, goal: 7, unlocked: true, unlockedAt: "2026-01-22" },
    { id: "a3", category: "pr", title: "100 kg Club", description: "Levanta 100 kg en cualquier maquina", icon: "Trophy", requirement: "Alcanza 100 kg en un set", progress: 80, goal: 100, unlocked: false },
    { id: "a4", category: "constancia", title: "Escanea 50 QR", description: "Escanea 50 codigos QR en total", icon: "QrCode", requirement: "50 escaneos QR", progress: 28, goal: 50, unlocked: false },
    { id: "a5", category: "volumen", title: "Maquina Dominada", description: "Registra 20 sesiones en la misma maquina", icon: "Target", requirement: "20 sesiones en 1 maquina", progress: 8, goal: 20, unlocked: false },
    { id: "a6", category: "racha", title: "Constancia de hierro", description: "30 dias consecutivos de racha", icon: "Shield", requirement: "30 dias de racha", progress: 4, goal: 30, unlocked: false },
    { id: "a7", category: "volumen", title: "10,000 kg Club", description: "Acumula 10,000 kg de volumen total", icon: "TrendingUp", requirement: "10,000 kg volumen total", progress: 6850, goal: 10000, unlocked: false },
    { id: "a8", category: "retos", title: "Retador", description: "Completa 3 retos", icon: "Swords", requirement: "3 retos completados", progress: 0, goal: 3, unlocked: false },
    { id: "a9", category: "pr", title: "PR Hunter", description: "Logra un PR en 5 maquinas distintas", icon: "Medal", requirement: "PR en 5 maquinas", progress: 3, goal: 5, unlocked: false },
    { id: "a10", category: "constancia", title: "Madrugador", description: "Entrena 10 veces antes de las 8am", icon: "Sun", requirement: "10 sesiones antes de 8am", progress: 2, goal: 10, unlocked: false },
  ]
}

// ── Build extended promos ─────────────────────────────────────
function buildPromos(): PromoExtended[] {
  return [
    { id: "p1", title: "20% en Suplementos", description: "Valido en la tienda del gym. Presenta tu codigo al momento de pagar.", validUntil: "2026-02-28", code: "MINTHY20", status: "vigente", terms: "Valido una sola vez por usuario. No acumulable con otras promos." },
    { id: "p2", title: "Clase Gratis de Spinning", description: "Inscribete en la proxima clase de spinning sin costo adicional.", validUntil: "2026-02-20", status: "vigente", terms: "Sujeto a disponibilidad. Reservar con 24h de anticipacion." },
    { id: "p3", title: "Trae un amigo", description: "Tu amigo entrena gratis 1 semana y tu ganas 200 puntos extra.", validUntil: "2026-03-15", status: "vigente", terms: "Amigo debe ser primera vez en el gym. Maximo 2 amigos por mes." },
    { id: "p4", title: "10% en Plan Anual", description: "Ahorra un 10% al cambiar a plan anual. Codigo disponible en la app.", validUntil: "2026-01-31", code: "ANUAL10", status: "expirado", usedAt: "2026-01-20", terms: "Valido solo para cambios de plan, no renovaciones." },
    { id: "p5", title: "Batido Gratis", description: "Presenta tu codigo al bar del gym para un batido proteico gratis.", validUntil: "2026-01-15", status: "expirado", usedAt: "2026-01-14", code: "BATIDO1", terms: "Un batido por usuario." },
  ]
}

// ── Build payment user ────────────────────────────────────────
function buildPayment(): PaymentUser {
  return {
    planPeriod: "Mensual",
    nextDueDate: "2026-02-15",
    status: "por vencer",
    history: [
      { date: "2026-01-10", amount: 45, method: "Tarjeta", status: "pagado" },
      { date: "2025-12-10", amount: 45, method: "Tarjeta", status: "pagado" },
      { date: "2025-11-10", amount: 45, method: "Efectivo", status: "pagado" },
      { date: "2025-10-10", amount: 45, method: "Tarjeta", status: "pagado" },
    ],
    alerts: [
      { id: "alert-1", message: "Tu pago vence el 15 de febrero. Renueva a tiempo para mantener tu acceso.", type: "warning", date: "2026-02-08" },
      { id: "alert-2", message: "Tienes disponible el descuento de 10% en plan anual.", type: "info", date: "2026-02-01" },
    ],
  }
}

// ── Build notifications ───────────────────────────────────────
function buildNotifications(): Notification[] {
  return [
    { id: "n1", title: "Promo nueva", message: "20% en Suplementos disponible", type: "promo", read: false, date: "2026-02-09T08:00:00" },
    { id: "n2", title: "Pago por vencer", message: "Tu pago vence el 15 de febrero", type: "payment", read: false, date: "2026-02-08T10:00:00" },
    { id: "n3", title: "Logro desbloqueado", message: "Racha de 7 dias completada", type: "achievement", read: true, date: "2026-01-22T09:00:00" },
    { id: "n4", title: "Promo por vencer", message: "Clase gratis de spinning vence el 20 feb", type: "promo", read: false, date: "2026-02-07T12:00:00" },
    { id: "n5", title: "Reto activo", message: "Te faltan 4 sets para completar Semana de Piernas", type: "challenge", read: true, date: "2026-02-06T15:00:00" },
  ]
}

// ── Build gym members ─────────────────────────────────────────
function buildGymMembers(): GymMember[] {
  return initialGymMembers.map((m) => ({ ...m, reminderSent: false }))
}

const StoreContext = createContext<StoreState | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>(convertLegacySets)
  const [achievements, setAchievements] = useState<AchievementExtended[]>(buildAchievements)
  const [challengesList] = useState<Challenge[]>(initialChallenges)
  const [optedInRankings, setOptedInRankings] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("minty_ranking_opt_in")
      if (stored !== null) return stored === "true"
    }
    return false
  })
  const [promosList, setPromosList] = useState<PromoExtended[]>(buildPromos)
  const [payment] = useState<PaymentUser>(buildPayment)
  const [gymMembers, setGymMembers] = useState<GymMember[]>(buildGymMembers)
  const [tutorialsSeen, setTutorialsSeen] = useState<Record<string, boolean>>({})
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg")
  const [notificationsList, setNotificationsList] = useState<Notification[]>(buildNotifications)
  const [userData, setUserData] = useState(initialUser)

  const addSession = useCallback((session: Omit<Session, "id">) => {
    setSessions((prev) => [
      { ...session, id: `session-${Date.now()}` },
      ...prev,
    ])
  }, [])

  const unlockAchievement = useCallback((id: string) => {
    setAchievements((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, unlocked: true, unlockedAt: "2026-02-10", progress: a.goal } : a
      )
    )
  }, [])

  const toggleRankingsOptIn = useCallback(() => {
    setOptedInRankings((prev) => {
      const next = !prev
      if (typeof window !== "undefined") {
        localStorage.setItem("minty_ranking_opt_in", String(next))
      }
      return next
    })
  }, [])

  const usePromo = useCallback((id: string) => {
    setPromosList((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: "expirado" as const, usedAt: "2026-02-10" } : p
      )
    )
  }, [])

  const markPaymentReceived = useCallback((memberId: string) => {
    setGymMembers((prev) =>
      prev.map((m) =>
        m.id === memberId ? { ...m, status: "al_dia" as const, nextPayment: "2026-03-15" } : m
      )
    )
  }, [])

  const sendReminder = useCallback((memberId: string) => {
    setGymMembers((prev) =>
      prev.map((m) =>
        m.id === memberId ? { ...m, reminderSent: true } : m
      )
    )
  }, [])

  const markTutorialSeen = useCallback((machineId: string) => {
    setTutorialsSeen((prev) => ({ ...prev, [machineId]: true }))
  }, [])

  const updateUser = useCallback((data: { name: string; email: string }) => {
    setUserData((prev) => ({
      ...prev,
      name: data.name,
      email: data.email,
      avatar: data.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
    }))
  }, [])

  const markNotificationRead = useCallback((id: string) => {
    setNotificationsList((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }, [])

  return (
    <StoreContext.Provider
      value={{
        sessions,
        addSession,
        achievements,
        unlockAchievement,
        challenges: challengesList,
        optedInRankings,
        toggleRankingsOptIn,
        promos: promosList,
        usePromo,
        payment,
        gymMembers,
        markPaymentReceived,
        sendReminder,
        tutorialsSeen,
        markTutorialSeen,
        weightUnit,
        setWeightUnit,
        notifications: notificationsList,
        markNotificationRead,
        rankings: initialRankings,
        user: userData,
        updateUser,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used inside StoreProvider")
  return ctx
}
