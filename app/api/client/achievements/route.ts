import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createAdminClient, createClient } from "@/lib/supabase/server"
import { syncUserStatsForProfile } from "@/lib/user-stats-sync"

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

const TOP10_TARGET_WEEKS = 4
const REGION_BALANCE_TARGET = 500
const HIGH_FP_DEFAULT_TARGET = 10
const CONSECUTIVE_WEEKS_DEFAULT_TARGET = 12
const TOP10_LIMITATION_NOTE =
  "Requiere Top 10 durante 4 semanas. El backend actual solo puede verificar el ranking presente hasta que exista soporte histórico."

interface AchievementRow {
  id: string
  name: string
  description: string | null
  category: string | null
  achievement_category?: string | null
  icon_name: string | null
  icon_color: string | null
  points: number | null
  criteria: unknown
  xp_threshold?: number | null
  is_active: boolean | null
  created_at: string | null
}

interface UserAchievementRow {
  achievement_id: string
  unlocked_at: string | null
}

interface UserStatsRow {
  total_sessions: number | null
  current_streak: number | null
  longest_streak: number | null
  total_volume_kg: number | null
}

interface AthleteXpTotalsRow {
  total_xp: number | null
  xp_by_region: unknown
  sessions_with_high_fp: number | null
  consecutive_weeks: number | null
}

interface ProgressSnapshot {
  current: number
  target: number
  pct: number
  criteriaType: string | null
}

interface AchievementDto {
  id: string
  name: string
  description: string | null
  category: string | null
  achievement_category: string | null
  icon_name: string | null
  icon_color: string | null
  points: number
  criteria: Record<string, unknown>
  is_unlocked: boolean
  unlocked_at: string | null
  progress_current: number
  progress_target: number
  progress_pct: number
  iconName: string | null
  iconColor: string | null
  unlocked: boolean
  unlockedAt: string | null
}

interface SortedAchievement {
  achievement: AchievementDto
  createdAt: string | null
}

const achievementCategoryFallback = new Map<string, string>([
  ["primera sesion", "general"],
  ["10 sesiones", "general"],
  ["50 sesiones", "general"],
  ["racha de 7 dias", "general"],
  ["racha de 30 dias", "general"],
  ["primer pr", "general"],
  ["10 records personales", "general"],
  ["volumen 1,000 kg", "general"],
  ["volumen 1000 kg", "general"],
  ["volumen 10,000 kg", "general"],
  ["volumen 10000 kg", "general"],
  ["atleta completo", "balance"],
  ["evolucion", "performance"],
  ["imparable", "consistency"],
  ["titan de hierro", "xp_volume"],
  ["top 10", "ranking"],
])

const criteriaTypeFallback = new Map<string, string>([
  ["atleta completo", "xp_by_region"],
  ["evolucion", "sessions_with_high_fp"],
  ["imparable", "consecutive_weeks"],
  ["titan de hierro", "total_xp"],
  ["top 10", "top10"],
])

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

function toFinitePercentage(current: number, target: number): number {
  if (target <= 0) {
    return current > 0 ? 100 : 0
  }

  const raw = Math.round((current / target) * 100)
  return Math.min(100, Math.max(0, raw))
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

function getCriteria(criteria: unknown): Record<string, unknown> {
  return isRecord(criteria) ? criteria : {}
}

function readNumberMap(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {}
  }

  const next: Record<string, number> = {}
  for (const [key, entry] of Object.entries(value)) {
    next[key] = toNonNegativeNumber(entry)
  }
  return next
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function normalizeCriteriaType(value: string | null): string | null {
  if (!value) return null

  const normalized = normalizeName(value).replace(/\s+/g, "_")
  switch (normalized) {
    case "sessions":
    case "streak":
    case "prs":
    case "volume":
    case "total_xp":
    case "xp_by_region":
    case "sessions_with_high_fp":
    case "consecutive_weeks":
      return normalized
    case "top10":
    case "top_10":
      return "top10"
    default:
      return null
  }
}

function deriveAchievementCategory(achievement: AchievementRow): string | null {
  const explicit = readString(achievement.achievement_category)
  if (explicit) {
    return explicit
  }

  return achievementCategoryFallback.get(normalizeName(achievement.name)) ?? null
}

function resolveCriteriaType(achievement: AchievementRow, criteria: Record<string, unknown>): string | null {
  const explicit = normalizeCriteriaType(readString(criteria.type))
  if (explicit) {
    return explicit
  }

  if (toNonNegativeNumber(achievement.xp_threshold) > 0) {
    return "total_xp"
  }

  return criteriaTypeFallback.get(normalizeName(achievement.name)) ?? null
}

function buildDescription(achievement: AchievementRow, criteriaType: string | null): string | null {
  if (criteriaType !== "top10") {
    return achievement.description
  }

  const base = achievement.description?.trim()
  if (!base) {
    return TOP10_LIMITATION_NOTE
  }

  if (base.includes(TOP10_LIMITATION_NOTE)) {
    return base
  }

  return `${base} ${TOP10_LIMITATION_NOTE}`
}

function getCreatedAtTime(value: string | null): number {
  if (!value) return Number.MAX_SAFE_INTEGER

  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER
}

function computeProgress(params: {
  achievement: AchievementRow
  criteria: Record<string, unknown>
  criteriaType: string | null
  isUnlocked: boolean
  userStats: UserStatsRow | null
  xpTotals: AthleteXpTotalsRow | null
  personalRecordsCount: number
}): ProgressSnapshot {
  const { achievement, criteria, criteriaType, isUnlocked, userStats, xpTotals, personalRecordsCount } = params

  const totalSessions = toNonNegativeNumber(userStats?.total_sessions)
  const currentStreak = Math.max(
    toNonNegativeNumber(userStats?.current_streak),
    toNonNegativeNumber(userStats?.longest_streak)
  )
  const totalVolumeKg = toNonNegativeNumber(userStats?.total_volume_kg)
  const totalXp = toNonNegativeNumber(xpTotals?.total_xp)
  const xpByRegion = readNumberMap(xpTotals?.xp_by_region)
  const upperXp = toNonNegativeNumber(xpByRegion.upper)
  const lowerXp = toNonNegativeNumber(xpByRegion.lower)
  const sessionsWithHighFp = toNonNegativeNumber(xpTotals?.sessions_with_high_fp)
  const consecutiveWeeks = toNonNegativeNumber(xpTotals?.consecutive_weeks)

  switch (criteriaType) {
    case "sessions": {
      const target = toNonNegativeNumber(criteria.value)
      return { current: totalSessions, target, pct: toFinitePercentage(totalSessions, target), criteriaType }
    }
    case "streak": {
      const target = toNonNegativeNumber(criteria.value)
      return { current: currentStreak, target, pct: toFinitePercentage(currentStreak, target), criteriaType }
    }
    case "prs": {
      const target = toNonNegativeNumber(criteria.value)
      return {
        current: personalRecordsCount,
        target,
        pct: toFinitePercentage(personalRecordsCount, target),
        criteriaType,
      }
    }
    case "volume": {
      const target = toNonNegativeNumber(criteria.value)
      return { current: totalVolumeKg, target, pct: toFinitePercentage(totalVolumeKg, target), criteriaType }
    }
    case "total_xp": {
      const target =
        toNonNegativeNumber(criteria.threshold) ||
        toNonNegativeNumber(achievement.xp_threshold) ||
        toNonNegativeNumber(criteria.value)
      return { current: totalXp, target, pct: toFinitePercentage(totalXp, target), criteriaType }
    }
    case "xp_by_region": {
      const current = Math.min(upperXp, lowerXp)
      return {
        current,
        target: REGION_BALANCE_TARGET,
        pct: toFinitePercentage(current, REGION_BALANCE_TARGET),
        criteriaType,
      }
    }
    case "sessions_with_high_fp": {
      const target = toNonNegativeNumber(criteria.sessions) || HIGH_FP_DEFAULT_TARGET
      return {
        current: sessionsWithHighFp,
        target,
        pct: toFinitePercentage(sessionsWithHighFp, target),
        criteriaType,
      }
    }
    case "consecutive_weeks": {
      const target = toNonNegativeNumber(criteria.weeks) || CONSECUTIVE_WEEKS_DEFAULT_TARGET
      return {
        current: consecutiveWeeks,
        target,
        pct: toFinitePercentage(consecutiveWeeks, target),
        criteriaType,
      }
    }
    case "top10": {
      const current = isUnlocked ? TOP10_TARGET_WEEKS : 0
      return {
        current,
        target: TOP10_TARGET_WEEKS,
        pct: isUnlocked ? 100 : 0,
        criteriaType,
      }
    }
    default: {
      const current = isUnlocked ? 1 : 0
      return { current, target: 1, pct: isUnlocked ? 100 : 0, criteriaType }
    }
  }
}

async function selectAchievements(
  supabase: SupabaseClient
): Promise<{ data: AchievementRow[] | null; error: unknown }> {
  const selects = [
    "id, name, description, category, achievement_category, icon_name, icon_color, points, criteria, xp_threshold, is_active, created_at",
    "id, name, description, category, achievement_category, icon_name, icon_color, points, criteria, is_active, created_at",
    "id, name, description, category, icon_name, icon_color, points, criteria, xp_threshold, is_active, created_at",
    "id, name, description, category, icon_name, icon_color, points, criteria, is_active, created_at",
  ]

  let lastError: unknown = null

  for (const selectClause of selects) {
    const result = await supabase
      .from("achievements")
      .select(selectClause)
      .eq("is_active", true)
      .order("created_at", { ascending: true })

    if (!result.error) {
      return {
        data: (result.data ?? null) as unknown as AchievementRow[] | null,
        error: null,
      }
    }

    lastError = result.error
  }

  return { data: null, error: lastError }
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient(request)
    const userId = sessionOrResponse.userId
    const adminClient = createAdminClient()

    await syncUserStatsForProfile({
      profileId: userId,
    })

    const { error: achievementsSyncError } = await adminClient.rpc("check_achievements", {
      p_profile_id: userId,
    })

    if (achievementsSyncError) {
      console.error("GET /api/client/achievements check_achievements error:", achievementsSyncError)
      return NextResponse.json({ error: "Error al sincronizar logros del atleta" }, { status: 500 })
    }

    const [
      achievementsResult,
      userAchievementsResult,
      userStatsResult,
      xpTotalsResult,
      personalRecordsResult,
    ] = await Promise.all([
      selectAchievements(supabase),
      supabase.from("user_achievements").select("achievement_id, unlocked_at").eq("profile_id", userId),
      supabase
        .from("user_stats")
        .select("total_sessions, current_streak, longest_streak, total_volume_kg")
        .eq("profile_id", userId)
        .maybeSingle(),
      supabase
        .from("athlete_xp_totals")
        .select("total_xp, xp_by_region, sessions_with_high_fp, consecutive_weeks")
        .eq("athlete_id", userId)
        .maybeSingle(),
      supabase.from("personal_records").select("id", { count: "exact", head: true }).eq("profile_id", userId),
    ])

    if (achievementsResult.error) {
      console.error("GET /api/client/achievements achievements query error:", achievementsResult.error)
      return NextResponse.json({ error: "Error al obtener logros" }, { status: 500 })
    }

    if (userAchievementsResult.error) {
      console.error("GET /api/client/achievements user_achievements query error:", userAchievementsResult.error)
      return NextResponse.json({ error: "Error al obtener logros del usuario" }, { status: 500 })
    }

    if (userStatsResult.error) {
      console.error("GET /api/client/achievements user_stats query error:", userStatsResult.error)
      return NextResponse.json({ error: "Error al obtener estadisticas del usuario" }, { status: 500 })
    }

    if (xpTotalsResult.error) {
      console.error("GET /api/client/achievements athlete_xp_totals query error:", xpTotalsResult.error)
      return NextResponse.json({ error: "Error al obtener progreso competitivo" }, { status: 500 })
    }

    if (personalRecordsResult.error) {
      console.error("GET /api/client/achievements personal_records query error:", personalRecordsResult.error)
      return NextResponse.json({ error: "Error al obtener records personales" }, { status: 500 })
    }

    const unlockedById = new Map<string, string | null>()
    for (const row of (userAchievementsResult.data ?? []) as UserAchievementRow[]) {
      unlockedById.set(row.achievement_id, row.unlocked_at)
    }

    const userStats = (userStatsResult.data ?? null) as UserStatsRow | null
    const xpTotals = (xpTotalsResult.data ?? null) as AthleteXpTotalsRow | null
    const personalRecordsCount = personalRecordsResult.count ?? 0

    const achievements = ((achievementsResult.data ?? []) as AchievementRow[])
      .map((achievement) => {
        const criteria = getCriteria(achievement.criteria)
        const unlockedAt = unlockedById.get(achievement.id) ?? null
        const isUnlocked = Boolean(unlockedAt)
        const criteriaType = resolveCriteriaType(achievement, criteria)
        const progress = computeProgress({
          achievement,
          criteria,
          criteriaType,
          isUnlocked,
          userStats,
          xpTotals,
          personalRecordsCount,
        })
        const description = buildDescription(achievement, criteriaType)
        const points = toNonNegativeNumber(achievement.points)

        return {
          achievement: {
            id: achievement.id,
            name: achievement.name,
            description,
            category: achievement.category,
            achievement_category: deriveAchievementCategory(achievement),
            icon_name: achievement.icon_name,
            icon_color: achievement.icon_color,
            points,
            criteria,
            is_unlocked: isUnlocked,
            unlocked_at: unlockedAt,
            progress_current: progress.current,
            progress_target: progress.target,
            progress_pct: progress.pct,
            iconName: achievement.icon_name,
            iconColor: achievement.icon_color,
            unlocked: isUnlocked,
            unlockedAt,
          },
          createdAt: achievement.created_at,
        } satisfies SortedAchievement
      })
      .sort((left, right) => {
        if (left.achievement.is_unlocked !== right.achievement.is_unlocked) {
          return left.achievement.is_unlocked ? -1 : 1
        }

        if (left.achievement.is_unlocked && right.achievement.is_unlocked) {
          return (
            new Date(right.achievement.unlocked_at ?? 0).getTime() -
            new Date(left.achievement.unlocked_at ?? 0).getTime()
          )
        }

        if (left.achievement.progress_pct !== right.achievement.progress_pct) {
          return right.achievement.progress_pct - left.achievement.progress_pct
        }

        return getCreatedAtTime(left.createdAt) - getCreatedAtTime(right.createdAt)
      })

    const responseAchievements: AchievementDto[] = achievements.map((entry) => entry.achievement)

    const unlockedCount = responseAchievements.filter((achievement) => achievement.is_unlocked).length
    const totalCount = responseAchievements.length
    const recentUnlocked = responseAchievements
      .filter((achievement): achievement is AchievementDto & { unlocked_at: string } => Boolean(achievement.unlocked_at))
      .sort((a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime())
      .slice(0, 5)

    return NextResponse.json({
      achievements: responseAchievements,
      unlockedCount,
      totalCount,
      recentUnlocked,
    })
  } catch (error) {
    console.error("GET /api/client/achievements unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
