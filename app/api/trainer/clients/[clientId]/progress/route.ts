import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { requireActiveConsent, requireConsentScope } from "@/lib/consent-guards"
import { listSessionsForClient } from "@/lib/trainer-data"

function calcVolume(sessions: { sets: { weight: number; reps: number }[] }[]) {
  return sessions.reduce(
    (acc, s) => acc + s.sets.reduce((sum, set) => sum + set.weight * set.reps, 0),
    0
  )
}

function uniqueSessionDays(sessions: { date: string }[]) {
  return Array.from(new Set(sessions.map((s) => s.date.split("T")[0]))).sort()
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const consentResult = requireActiveConsent({
    trainerId: sessionOrResponse.userId,
    clientId,
  })
  if ("error" in consentResult) return consentResult.error

  const scopeResult = requireConsentScope(consentResult.consent, "progress:read")
  if ("error" in scopeResult) return scopeResult.error

  const sessions = listSessionsForClient(clientId)
  const now = new Date()
  const dayMs = 24 * 60 * 60 * 1000

  const last7 = sessions.filter(
    (s) => now.getTime() - new Date(s.date).getTime() <= 7 * dayMs
  )
  const prev7 = sessions.filter((s) => {
    const diff = now.getTime() - new Date(s.date).getTime()
    return diff > 7 * dayMs && diff <= 14 * dayMs
  })
  const last30 = sessions.filter(
    (s) => now.getTime() - new Date(s.date).getTime() <= 30 * dayMs
  )

  const weeklyVolume = calcVolume(last7)
  const prevWeeklyVolume = calcVolume(prev7)
  const monthlyVolume = calcVolume(last30)
  const sessionsPerWeek = last7.length

  const changePct =
    prevWeeklyVolume === 0 ? 100 : ((weeklyVolume - prevWeeklyVolume) / prevWeeklyVolume) * 100

  const daysSorted = uniqueSessionDays(sessions).sort().reverse()
  let streak = 0
  let cursor = new Date(now.toDateString())
  const sessionDaySet = new Set(daysSorted)
  while (sessionDaySet.has(cursor.toISOString().split("T")[0])) {
    streak += 1
    cursor = new Date(cursor.getTime() - dayMs)
  }

  const plateau = weeklyVolume < prevWeeklyVolume * 0.9 && sessionsPerWeek <= prev7.length

  return NextResponse.json({
    kpis: {
      weeklyVolume,
      monthlyVolume,
      sessionsPerWeek,
      streak,
    },
    comparison: {
      prevWeeklyVolume,
      changePct,
    },
    trend: {
      direction: weeklyVolume >= prevWeeklyVolume ? "up" : "down",
      note:
        weeklyVolume >= prevWeeklyVolume
          ? "Mejora respecto a la semana anterior"
          : "Baja respecto a la semana anterior",
    },
    plateau: {
      isPlateau: plateau,
      reason: plateau
        ? "Volumen semanal menor al 90% de la semana anterior"
        : "Sin señales de estancamiento",
    },
  })
}

