import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

type Period = "week" | "month" | "year" | "all"

function parsePeriod(value: string | null): Period {
  if (value === "week" || value === "month" || value === "year") return value
  return "all"
}

function getPeriodStart(period: Period): string | null {
  const now = Date.now()
  if (period === "week") return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
  if (period === "month") return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
  if (period === "year") return new Date(now - 365 * 24 * 60 * 60 * 1000).toISOString()
  return null
}

interface UserStatsRow {
  total_sessions: number | null
  personal_records_count: number | null
  current_streak: number | null
  total_volume_kg: number | null
}

interface RankingRow {
  rank_position: number | null
}

interface SessionDurationRow {
  duration_minutes: number | null
}

interface QrWithMachine {
  machines: { muscle_groups: unknown } | { muscle_groups: unknown }[] | null
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient(request)
    const userId = sessionOrResponse.userId
    const period = parsePeriod(request.nextUrl.searchParams.get("period"))
    const periodStart = getPeriodStart(period)

    let sessionsQuery = supabase
      .from("workout_sessions")
      .select("duration_minutes")
      .eq("profile_id", userId)
      .eq("status", "completed")
    if (periodStart) sessionsQuery = sessionsQuery.gte("started_at", periodStart)

    let qrQuery = supabase
      .from("qr_sessions")
      .select("machines(muscle_groups)")
      .eq("athlete_id", userId)
    if (periodStart) qrQuery = qrQuery.gte("created_at", periodStart)

    const [statsResult, rankResult, sessionsResult, qrResult] = await Promise.all([
      supabase
        .from("user_stats")
        .select("total_sessions, personal_records_count, current_streak, total_volume_kg")
        .eq("profile_id", userId)
        .maybeSingle(),
      supabase
        .from("global_rankings")
        .select("rank_position")
        .eq("athlete_id", userId)
        .maybeSingle(),
      sessionsQuery,
      qrQuery,
    ])

    if (statsResult.error) {
      console.error("GET /api/client/progress/overview stats error:", statsResult.error)
      return NextResponse.json({ error: "Error al obtener estadísticas" }, { status: 500 })
    }
    if (sessionsResult.error) {
      console.error("GET /api/client/progress/overview sessions error:", sessionsResult.error)
      return NextResponse.json({ error: "Error al obtener sesiones" }, { status: 500 })
    }
    if (qrResult.error) {
      console.error("GET /api/client/progress/overview qr error:", qrResult.error)
      return NextResponse.json({ error: "Error al obtener ejercicios" }, { status: 500 })
    }

    // Compute avg_duration_min for the period
    const validDurations = ((sessionsResult.data ?? []) as SessionDurationRow[])
      .map((s) => s.duration_minutes)
      .filter((d): d is number => typeof d === "number" && d > 0)
    const avgDuration =
      validDurations.length > 0
        ? Math.round(validDurations.reduce((sum, d) => sum + d, 0) / validDurations.length)
        : 0

    // Compute muscle session counts for the period — exclude catch-all tags
    const MUSCLE_GROUPS = ["chest", "back", "shoulders", "biceps", "triceps", "arms", "legs", "glutes", "core"]
    const EXCLUDED = new Set(["full_body", "cardio"])
    const muscleCount = new Map<string, number>()
    for (const row of (qrResult.data ?? []) as QrWithMachine[]) {
      const machine = Array.isArray(row.machines) ? row.machines[0] : row.machines
      if (!machine) continue
      const groups = (machine as Record<string, unknown>).muscle_groups
      if (!Array.isArray(groups)) continue
      for (const g of groups) {
        if (typeof g === "string" && !EXCLUDED.has(g)) {
          muscleCount.set(g, (muscleCount.get(g) ?? 0) + 1)
        }
      }
    }
    // All 9 fixed groups always present, 0-session muscles fill the bottom
    const muscleRanking = MUSCLE_GROUPS
      .map((name) => ({ name, count: muscleCount.get(name) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

    const stats = statsResult.data as UserStatsRow | null
    const rank = rankResult.data as RankingRow | null

    return NextResponse.json({
      total_sessions: stats?.total_sessions ?? 0,
      avg_duration_min: avgDuration,
      total_prs: stats?.personal_records_count ?? 0,
      rank_position: rank?.rank_position ?? null,
      current_streak: stats?.current_streak ?? 0,
      total_volume_kg: stats?.total_volume_kg ?? 0,
      muscle_ranking: muscleRanking,
    })
  } catch (error) {
    console.error("GET /api/client/progress/overview unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
