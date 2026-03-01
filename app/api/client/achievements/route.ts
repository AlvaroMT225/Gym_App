import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

interface AchievementRow {
  id: string
  name: string
  description: string | null
  category: string | null
  icon_name: string | null
  icon_color: string
  points: number
  criteria: Record<string, unknown>
  is_active: boolean
  created_at: string
}

interface UserAchievementRow {
  achievement_id: string
  unlocked_at: string
}

interface AchievementDto {
  id: string
  name: string
  description: string | null
  category: string | null
  iconName: string | null
  iconColor: string
  points: number
  criteria: Record<string, unknown>
  unlocked: boolean
  unlockedAt: string | null
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const userId = sessionOrResponse.userId

    const [{ data: achievementsData, error: achievementsError }, { data: userAchievementsData, error: userAchievementsError }] =
      await Promise.all([
        supabase
          .from("achievements")
          .select(
            "id, name, description, category, icon_name, icon_color, points, criteria, is_active, created_at"
          )
          .eq("is_active", true)
          .order("created_at", { ascending: true }),
        supabase
          .from("user_achievements")
          .select("achievement_id, unlocked_at")
          .eq("profile_id", userId),
      ])

    if (achievementsError) {
      console.error("GET /api/client/achievements achievements query error:", achievementsError)
      return NextResponse.json({ error: "Error al obtener logros" }, { status: 500 })
    }

    if (userAchievementsError) {
      console.error("GET /api/client/achievements user_achievements query error:", userAchievementsError)
      return NextResponse.json({ error: "Error al obtener logros del usuario" }, { status: 500 })
    }

    const unlockedById = new Map<string, string>()
    for (const row of (userAchievementsData ?? []) as UserAchievementRow[]) {
      unlockedById.set(row.achievement_id, row.unlocked_at)
    }

    const achievements: AchievementDto[] = ((achievementsData ?? []) as AchievementRow[]).map((achievement) => {
      const unlockedAt = unlockedById.get(achievement.id) ?? null
      return {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        category: achievement.category,
        iconName: achievement.icon_name,
        iconColor: achievement.icon_color,
        points: achievement.points,
        criteria: achievement.criteria,
        unlocked: Boolean(unlockedAt),
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
