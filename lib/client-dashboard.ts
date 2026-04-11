import { createAdminClient, createClient } from "@/lib/supabase/server"

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

type RankingRow = {
  rank_position: unknown
}

type GlobalRankingScoreRow = {
  global_score: number | null
}

type RegionalRankingScoreRow = {
  region: string
  final_score: number | null
}

type AthleteXpTotalsSummaryRow = {
  total_xp: number | null
  xp_by_region: unknown
}

type QrSessionMetricRow = {
  created_at: string
  total_volume: number | null
}

export interface CompetitiveXpSummary {
  athlete_xp_totals: {
    total_xp: number
    xp_by_region: {
      upper: number
      lower: number
    }
  }
}

export interface CompetitiveDashboardSummary {
  kpis: {
    prs_total: number
    weekly_volume: number
    qr_sessions: number
    streak: number
  }
  ranking: {
    position: number | null
  }
  meta: {
    qr_sessions_window_days: 7
    weekly_volume_window_days: 7
    prs_total_source: "unavailable_qr_only"
  }
}

const DASHBOARD_WINDOW_DAYS = 7 as const
const DASHBOARD_TIME_ZONE = "America/Guayaquil"
const STREAK_LOOKBACK_LIMIT = 365

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function toNonNegativeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value >= 0 ? value : 0
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return parsed >= 0 ? parsed : 0
    }
  }

  return 0
}

function toNullableRank(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.trunc(value)
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }

  return null
}

function readNumberMap(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {}
  }

  const parsed: Record<string, number> = {}
  for (const [key, entry] of Object.entries(value)) {
    parsed[key] = toNonNegativeNumber(entry)
  }
  return parsed
}

function getNowInTimeZone(timeZone: string): Date {
  const localNow = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())

  return new Date(`${localNow}T00:00:00`)
}

function formatDateInTimeZone(dateIso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateIso))
}

function subtractDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() - days)
  return next
}

function calculateQrStreak(sessionDates: string[], timeZone: string): number {
  if (sessionDates.length === 0) {
    return 0
  }

  const distinctDates = Array.from(new Set(sessionDates)).sort((left, right) => right.localeCompare(left))
  if (distinctDates.length === 0) {
    return 0
  }

  const today = getNowInTimeZone(timeZone)
  const todayKey = formatDateInTimeZone(today.toISOString(), timeZone)
  const yesterdayKey = formatDateInTimeZone(subtractDays(today, 1).toISOString(), timeZone)
  const firstDate = distinctDates[0]

  if (firstDate !== todayKey && firstDate !== yesterdayKey) {
    return 0
  }

  let streak = 0
  let expected = firstDate

  for (const entry of distinctDates) {
    if (entry !== expected) {
      break
    }

    streak += 1
    expected = formatDateInTimeZone(subtractDays(new Date(`${expected}T00:00:00`), 1).toISOString(), timeZone)
  }

  return streak
}

async function getGlobalRankingPosition(athleteId: string, gymId: string): Promise<number | null> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from("global_rankings")
    .select("rank_position")
    .eq("athlete_id", athleteId)
    .eq("gym_id", gymId)
    .maybeSingle()

  if (error) {
    console.error("client dashboard global ranking query error:", error)
    return null
  }

  if (!data || !isRecord(data)) {
    return null
  }

  return toNullableRank((data as RankingRow).rank_position)
}

export async function getCompetitiveXpSummary(
  supabase: SupabaseClient,
  athleteId: string,
  gymId: string
): Promise<CompetitiveXpSummary> {
  const [
    { data: xpTotalsData, error: xpTotalsError },
    { data: globalData, error: globalError },
    { data: regionalData, error: regionalError },
  ] = await Promise.all([
    supabase
      .from("athlete_xp_totals")
      .select("total_xp, xp_by_region")
      .eq("athlete_id", athleteId)
      .eq("gym_id", gymId)
      .maybeSingle(),
    supabase
      .from("global_rankings")
      .select("global_score")
      .eq("athlete_id", athleteId)
      .eq("gym_id", gymId)
      .maybeSingle(),
    supabase
      .from("regional_rankings")
      .select("region, final_score")
      .eq("athlete_id", athleteId)
      .eq("gym_id", gymId)
      .in("region", ["upper", "lower"]),
  ])

  if (xpTotalsError) {
    throw xpTotalsError
  }

  if (globalError) {
    throw globalError
  }

  if (regionalError) {
    throw regionalError
  }

  const xpTotalsRow = (xpTotalsData ?? null) as AthleteXpTotalsSummaryRow | null
  const globalRow = (globalData ?? null) as GlobalRankingScoreRow | null
  const regionalRows = (regionalData ?? []) as RegionalRankingScoreRow[]
  const upperRow = regionalRows.find((r) => r.region === "upper") ?? null
  const lowerRow = regionalRows.find((r) => r.region === "lower") ?? null
  const xpByRegion = readNumberMap(xpTotalsRow?.xp_by_region)

  return {
    athlete_xp_totals: {
      total_xp: xpTotalsRow ? toNonNegativeNumber(xpTotalsRow.total_xp) : toNonNegativeNumber(globalRow?.global_score),
      xp_by_region: {
        upper: xpTotalsRow ? toNonNegativeNumber(xpByRegion.upper) : toNonNegativeNumber(upperRow?.final_score),
        lower: xpTotalsRow ? toNonNegativeNumber(xpByRegion.lower) : toNonNegativeNumber(lowerRow?.final_score),
      },
    },
  }
}

export async function getCompetitiveDashboardSummary(params: {
  supabase: SupabaseClient
  athleteId: string
  gymId: string
}): Promise<CompetitiveDashboardSummary> {
  const { supabase, athleteId, gymId } = params
  const windowStart = new Date(Date.now() - DASHBOARD_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: weeklyRows, error: weeklyError },
    { data: streakRows, error: streakError },
    rankingPosition,
  ] = await Promise.all([
    supabase
      .from("qr_sessions")
      .select("created_at, total_volume")
      .eq("athlete_id", athleteId)
      .gte("created_at", windowStart)
      .order("created_at", { ascending: false }),
    supabase
      .from("qr_sessions")
      .select("created_at, total_volume")
      .eq("athlete_id", athleteId)
      .order("created_at", { ascending: false })
      .limit(STREAK_LOOKBACK_LIMIT),
    getGlobalRankingPosition(athleteId, gymId),
  ])

  if (weeklyError) {
    throw weeklyError
  }

  if (streakError) {
    throw streakError
  }

  const weeklyMetrics = (weeklyRows ?? []) as QrSessionMetricRow[]
  const streakMetrics = (streakRows ?? []) as QrSessionMetricRow[]

  const weeklyVolume = weeklyMetrics.reduce(
    (sum, row) => sum + toNonNegativeNumber(row.total_volume),
    0
  )

  const streak = calculateQrStreak(
    streakMetrics.map((row) => formatDateInTimeZone(row.created_at, DASHBOARD_TIME_ZONE)),
    DASHBOARD_TIME_ZONE
  )

  return {
    kpis: {
      prs_total: 0,
      weekly_volume: weeklyVolume,
      qr_sessions: weeklyMetrics.length,
      streak,
    },
    ranking: {
      position: rankingPosition,
    },
    meta: {
      qr_sessions_window_days: DASHBOARD_WINDOW_DAYS,
      weekly_volume_window_days: DASHBOARD_WINDOW_DAYS,
      prs_total_source: "unavailable_qr_only",
    },
  }
}
