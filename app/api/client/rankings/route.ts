import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

interface RankingEntryDto {
  rank: number
  name: string
  points: number
  avatar: string
  isUser: boolean
}

interface ProfileRow {
  id: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
}

interface UserStatRow {
  profile_id: string
  total_points: number
}

function buildAvatar(firstName: string | null, lastName: string | null): string {
  const first = (firstName ?? "?").charAt(0).toUpperCase()
  const last = (lastName ?? "?").charAt(0).toUpperCase()
  return `${first}${last}`
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const userId = sessionOrResponse.userId

    // Get user's gym_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", userId)
      .single()

    if (profileError || !profile?.gym_id) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })
    }

    const gymId = profile.gym_id

    // Step 1: get all active profiles in this gym
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, avatar_url")
      .eq("gym_id", gymId)
      .eq("is_active", true)

    if (profilesError) {
      console.error("GET /api/client/rankings profiles error:", profilesError)
      return NextResponse.json({ error: "Error al obtener perfiles del gym" }, { status: 500 })
    }

    const profiles = (profilesData ?? []) as ProfileRow[]
    const profileIds = profiles.map((p) => p.id)

    if (profileIds.length === 0) {
      return NextResponse.json({ rankings: [] })
    }

    // Step 2: get user_stats for those profiles, ordered by total_points
    const { data: statsData, error: statsError } = await supabase
      .from("user_stats")
      .select("profile_id, total_points")
      .in("profile_id", profileIds)
      .order("total_points", { ascending: false })
      .limit(20)

    if (statsError) {
      console.error("GET /api/client/rankings user_stats error:", statsError)
      return NextResponse.json({ error: "Error al obtener estadísticas de ranking" }, { status: 500 })
    }

    const stats = (statsData ?? []) as UserStatRow[]

    // Build a profile lookup map
    const profileMap = new Map<string, ProfileRow>(profiles.map((p) => [p.id, p]))

    // Build ranking entries — only members with stats appear in ranking
    const rankings: RankingEntryDto[] = stats
      .filter((s) => profileMap.has(s.profile_id))
      .map((s, index) => {
        const p = profileMap.get(s.profile_id)!
        return {
          rank: index + 1,
          name: [p.first_name, p.last_name].filter(Boolean).join(" ") || "Atleta",
          points: s.total_points ?? 0,
          avatar: p.avatar_url ? p.avatar_url.slice(0, 2).toUpperCase() : buildAvatar(p.first_name, p.last_name),
          isUser: s.profile_id === userId,
        }
      })

    // If current user has no stats entry yet, append them at the bottom
    const userInRanking = rankings.some((r) => r.isUser)
    if (!userInRanking) {
      const userProfile = profileMap.get(userId)
      if (userProfile) {
        rankings.push({
          rank: rankings.length + 1,
          name: [userProfile.first_name, userProfile.last_name].filter(Boolean).join(" ") || "Tú",
          points: 0,
          avatar: buildAvatar(userProfile.first_name, userProfile.last_name),
          isUser: true,
        })
      }
    }

    return NextResponse.json({ rankings })
  } catch (error) {
    console.error("GET /api/client/rankings unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
