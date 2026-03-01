import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { requireActiveConsent, requireConsentScope } from "@/lib/consent-guards"
import { createClient } from "@/lib/supabase/server"

const DAY_MS = 24 * 60 * 60 * 1000

function uniqueDays(timestamps: string[]): Set<string> {
  return new Set(timestamps.map((t) => t.split("T")[0]))
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const coachId = sessionOrResponse.userId

  try {
    const supabase = await createClient()

    const consentResult = await requireActiveConsent(supabase, coachId, clientId)
    if ("error" in consentResult) return consentResult.error

    const scopeResult = requireConsentScope(consentResult.consent, "view_progress")
    if ("error" in scopeResult) return scopeResult.error

    const { data, error } = await supabase
      .from("workout_sessions")
      .select("id, started_at, total_volume_kg")
      .eq("profile_id", clientId)
      .order("started_at", { ascending: false })

    if (error) {
      console.error("GET /api/trainer/clients/[clientId]/progress query error:", error)
      return NextResponse.json({ error: "Error al obtener sesiones" }, { status: 500 })
    }

    const sessions = data ?? []

    if (sessions.length === 0) {
      return NextResponse.json({
        kpis: { weeklyVolume: 0, monthlyVolume: 0, sessionsPerWeek: 0, streak: 0 },
        comparison: { prevWeeklyVolume: 0, changePct: 0 },
        trend: { direction: "up", note: "Sin sesiones registradas" },
        plateau: { isPlateau: false, reason: "Sin señales de estancamiento" },
      })
    }

    const now = new Date()

    // Rolling window boundaries (epoch ms)
    const t7ago = now.getTime() - 7 * DAY_MS
    const t14ago = now.getTime() - 14 * DAY_MS
    const t30ago = now.getTime() - 30 * DAY_MS

    let weeklyVolume = 0
    let prevWeeklyVolume = 0
    let monthlyVolume = 0
    let sessionsThisWeek = 0
    let sessionsPrevWeek = 0
    const allTimestamps: string[] = []

    for (const s of sessions) {
      const ts = new Date(s.started_at).getTime()
      const vol = Number(s.total_volume_kg ?? 0)
      allTimestamps.push(s.started_at)

      if (ts >= t7ago) {
        weeklyVolume += vol
        sessionsThisWeek++
      } else if (ts >= t14ago) {
        prevWeeklyVolume += vol
        sessionsPrevWeek++
      }

      if (ts >= t30ago) {
        monthlyVolume += vol
      }
    }

    // changePct: percentage change vs prior 7-day window
    const changePct =
      prevWeeklyVolume === 0
        ? weeklyVolume > 0 ? 100 : 0
        : ((weeklyVolume - prevWeeklyVolume) / prevWeeklyVolume) * 100

    // Streak: consecutive days with at least 1 session counting back from today
    const sessionDaySet = uniqueDays(allTimestamps)
    let streak = 0
    let cursor = new Date(now.toDateString()) // midnight UTC of today
    while (sessionDaySet.has(cursor.toISOString().split("T")[0])) {
      streak++
      cursor = new Date(cursor.getTime() - DAY_MS)
    }

    // Plateau: this week's volume is < 90% of last week AND session count didn't grow
    const isPlateau =
      prevWeeklyVolume > 0 &&
      weeklyVolume < prevWeeklyVolume * 0.9 &&
      sessionsThisWeek <= sessionsPrevWeek

    return NextResponse.json({
      kpis: {
        weeklyVolume,
        monthlyVolume,
        sessionsPerWeek: sessionsThisWeek,
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
        isPlateau,
        reason: isPlateau
          ? "Volumen semanal menor al 90% de la semana anterior"
          : "Sin señales de estancamiento",
      },
    })
  } catch (err) {
    console.error("GET /api/trainer/clients/[clientId]/progress unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
