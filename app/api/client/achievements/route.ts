import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { formatNumber } from "@/lib/utils"

interface AchievementRow {
  id: string
  name: string
  description: string | null
  category: string | null
  achievement_category: string | null
  icon_name: string | null
  icon_color: string | null
  points: number | null
  criteria: Record<string, unknown> | null
  xp_threshold: number | null
  is_active: boolean
  created_at: string
}

interface UserAchievementRow {
  achievement_id: string
  unlocked_at: string
  xp_at_unlock: number | null
}

interface AthleteXpTotalsRow {
  total_xp: number | null
  sessions_with_high_fp: number | null
  consecutive_weeks: number | null
  xp_by_region: unknown
}

interface AchievementDto {
  id: string
  name: string
  description: string | null
  category: string | null
  achievementCategory: string | null
  iconName: string | null
  iconColor: string
  points: number
  criteria: Record<string, unknown>
  xpThreshold: number | null
  xpAtUnlock: number | null
  progressCurrent: number
  progressTarget: number | null
  progressPercent: number
  progressLabel: string | null
  unlocked: boolean
  unlockedAt: string | null
}

interface XpMetrics {
  totalXp: number
  sessionsWithHighFp: number
  consecutiveWeeks: number
  upperXp: number
  lowerXp: number
}

interface AchievementProgress {
  current: number
  target: number | null
  percent: number
  label: string | null
}

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

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value <= 0) return 0
  if (value >= 100) return 100
  return value
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

function readXpMetrics(row: unknown): XpMetrics {
  if (!isRecord(row)) {
    return {
      totalXp: 0,
      sessionsWithHighFp: 0,
      consecutiveWeeks: 0,
      upperXp: 0,
      lowerXp: 0,
    }
  }

  const region = isRecord(row["xp_by_region"]) ? row["xp_by_region"] : null
  return {
    totalXp: toNonNegativeNumber(row["total_xp"]),
    sessionsWithHighFp: toNonNegativeNumber(row["sessions_with_high_fp"]),
    consecutiveWeeks: toNonNegativeNumber(row["consecutive_weeks"]),
    upperXp: toNonNegativeNumber(region?.["upper"]),
    lowerXp: toNonNegativeNumber(region?.["lower"]),
  }
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

function buildProgress(achievement: AchievementRow, metrics: XpMetrics, unlocked: boolean): AchievementProgress {
  const threshold = toNonNegativeNumber(achievement.xp_threshold)
  if (threshold > 0) {
    const percent = clampPercent((metrics.totalXp / threshold) * 100)
    return {
      current: metrics.totalXp,
      target: threshold,
      percent: unlocked ? 100 : percent,
      label: `${formatNumber(metrics.totalXp)} / ${formatNumber(threshold)} XP (${formatPercent(percent)})`,
    }
  }

  const name = normalizeName(achievement.name)
  if (name === "evolucion") {
    const target = 10
    const percent = clampPercent((metrics.sessionsWithHighFp / target) * 100)
    return {
      current: metrics.sessionsWithHighFp,
      target,
      percent: unlocked ? 100 : percent,
      label: `${formatNumber(metrics.sessionsWithHighFp)} / ${formatNumber(target)} sesiones (${formatPercent(percent)})`,
    }
  }

  if (name === "imparable") {
    const target = 12
    const percent = clampPercent((metrics.consecutiveWeeks / target) * 100)
    return {
      current: metrics.consecutiveWeeks,
      target,
      percent: unlocked ? 100 : percent,
      label: `${formatNumber(metrics.consecutiveWeeks)} / ${formatNumber(target)} semanas (${formatPercent(percent)})`,
    }
  }

  if (name === "atleta completo") {
    const target = 500
    const minRegion = Math.min(metrics.upperXp, metrics.lowerXp)
    const percent = clampPercent((minRegion / target) * 100)
    return {
      current: minRegion,
      target,
      percent: unlocked ? 100 : percent,
      label: `Superior ${formatNumber(metrics.upperXp)} / 500 XP · Inferior ${formatNumber(metrics.lowerXp)} / 500 XP (${formatPercent(percent)})`,
    }
  }

  return {
    current: unlocked ? 1 : 0,
    target: 1,
    percent: unlocked ? 100 : 0,
    label: unlocked ? "Completado (100%)" : null,
  }
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const userId = sessionOrResponse.userId

    const [
      { data: achievementsData, error: achievementsError },
      { data: xpTotalsData, error: xpTotalsError },
    ] = await Promise.all([
      supabase
        .from("achievements")
        .select(
          "id, name, description, category, achievement_category, icon_name, icon_color, points, criteria, xp_threshold, is_active, created_at"
        )
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
      supabase
        .from("athlete_xp_totals")
        .select("total_xp, sessions_with_high_fp, consecutive_weeks, xp_by_region")
        .eq("athlete_id", userId)
        .maybeSingle(),
    ])

    let userAchievementsData: UserAchievementRow[] | null = null
    let userAchievementsError: { message?: string } | null = null

    const userAchievementsWithXp = await supabase
      .from("user_achievements")
      .select("achievement_id, unlocked_at, xp_at_unlock")
      .eq("profile_id", userId)

    if (userAchievementsWithXp.error) {
      const message = userAchievementsWithXp.error.message ?? ""
      if (message.toLowerCase().includes("xp_at_unlock")) {
        const fallbackQuery = await supabase
          .from("user_achievements")
          .select("achievement_id, unlocked_at")
          .eq("profile_id", userId)

        userAchievementsData = (fallbackQuery.data ?? []) as UserAchievementRow[]
        userAchievementsError = fallbackQuery.error
      } else {
        userAchievementsError = userAchievementsWithXp.error
      }
    } else {
      userAchievementsData = (userAchievementsWithXp.data ?? []) as UserAchievementRow[]
      userAchievementsError = null
    }

    if (achievementsError) {
      console.error("GET /api/client/achievements achievements query error:", achievementsError)
      return NextResponse.json({ error: "Error al obtener logros" }, { status: 500 })
    }

    if (userAchievementsError) {
      console.error("GET /api/client/achievements user_achievements query error:", userAchievementsError)
      return NextResponse.json({ error: "Error al obtener logros del usuario" }, { status: 500 })
    }

    if (xpTotalsError) {
      console.error("GET /api/client/achievements athlete_xp_totals query error:", xpTotalsError)
    }

    const metrics = readXpMetrics(xpTotalsData ?? null)

    const unlockedById = new Map<string, { unlockedAt: string; xpAtUnlock: number | null }>()
    for (const row of (userAchievementsData ?? []) as UserAchievementRow[]) {
      unlockedById.set(row.achievement_id, {
        unlockedAt: row.unlocked_at,
        xpAtUnlock: toNonNegativeNumber(row.xp_at_unlock),
      })
    }

    const achievements: AchievementDto[] = ((achievementsData ?? []) as AchievementRow[]).map((achievement) => {
      const unlockedEntry = unlockedById.get(achievement.id) ?? null
      const unlockedAt = unlockedEntry?.unlockedAt ?? null
      const unlocked = Boolean(unlockedAt)
      const progress = buildProgress(achievement, metrics, unlocked)
      return {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        category: achievement.category,
        achievementCategory: achievement.achievement_category,
        iconName: achievement.icon_name,
        iconColor: achievement.icon_color ?? "",
        points: toNonNegativeNumber(achievement.points),
        criteria: isRecord(achievement.criteria) ? achievement.criteria : {},
        xpThreshold: toNonNegativeNumber(achievement.xp_threshold) || null,
        xpAtUnlock: unlockedEntry?.xpAtUnlock ?? null,
        progressCurrent: progress.current,
        progressTarget: progress.target,
        progressPercent: progress.percent,
        progressLabel: progress.label,
        unlocked,
        unlockedAt,
      }
    })

    const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length
    const totalCount = achievements.length
    const recentUnlocked = achievements
      .filter((achievement): achievement is AchievementDto & { unlockedAt: string } => Boolean(achievement.unlockedAt))
      .sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime())
      .slice(0, 5)

    return NextResponse.json({
      achievements,
      unlockedCount,
      totalCount,
      recentUnlocked,
    })
  } catch (error) {
    console.error("GET /api/client/achievements unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
