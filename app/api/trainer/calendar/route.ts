import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { listActiveConsentsForTrainer } from "@/lib/consents"
import { listPlannedSessionsForClient, type PlannedSession } from "@/lib/planned-sessions"
import { getClientById, exerciseCatalog } from "@/lib/trainer-data"

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const trainerId = sessionOrResponse.userId
  const consents = listActiveConsentsForTrainer(trainerId)

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const days: Array<{
    date: string
    dayLabel: string
    sessions: Array<{
      id: string
      title: string
      clientName: string
      clientAvatar: string
      clientId: string
      scheduledAt: string
      exerciseCount: number
      exercises: string[]
    }>
  }> = []

  // Generate 7 days
  const allSessions: Array<PlannedSession & { clientName: string; clientAvatar: string }> = []

  for (const consent of consents) {
    const sessions = listPlannedSessionsForClient(consent.client_id)
    const client = getClientById(consent.client_id)
    for (const session of sessions) {
      if (session.trainerId !== trainerId) continue
      if (!session.scheduledAt) continue
      const d = new Date(session.scheduledAt)
      if (d >= now && d < weekEnd) {
        allSessions.push({
          ...session,
          clientName: client?.name || consent.client_id,
          clientAvatar: client?.avatar || "??",
        })
      }
    }
  }

  for (let i = 0; i < 7; i++) {
    const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000)
    const dateStr = date.toISOString().split("T")[0]
    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
    const dayLabel = dayNames[date.getDay()]

    const daySessions = allSessions
      .filter((s) => s.scheduledAt!.startsWith(dateStr))
      .map((s) => ({
        id: s.id,
        title: s.title,
        clientName: s.clientName,
        clientAvatar: s.clientAvatar,
        clientId: s.clientId,
        scheduledAt: s.scheduledAt!,
        exerciseCount: s.items.length,
        exercises: s.items.map(
          (item) => exerciseCatalog.find((e) => e.id === item.exerciseId)?.name || item.exerciseId
        ),
      }))

    days.push({ date: dateStr, dayLabel, sessions: daySessions })
  }

  return NextResponse.json({ days })
}
