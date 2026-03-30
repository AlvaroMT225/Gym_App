import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/server"
import {
  calculateTendency,
  LEADERBOARD_LIMIT,
  LeaderboardProfileRow,
  matchesAgeRangeFilter,
  matchesGenderFilter,
  normalizeNickname,
  normalizeNumber,
  normalizeRank,
  parseAgeRangeFilter,
  parseGenderFilter,
  parseRegionFilter,
} from "@/lib/rankings"

interface AthleteProfileLookupRow extends LeaderboardProfileRow {
  id: string
}

interface RegionalRankingRow {
  athlete_id: string
  gym_id: string
  region: "upper" | "lower"
  final_score: number | null
  coverage_factor: number | null
  groups_trained: number | null
  rank_position: number | null
  previous_rank: number | null
}

interface RegionalLeaderboardEntry {
  athlete_id: string
  rank_position: number | null
  previous_rank: number | null
  nickname: string
  final_score: number
  coverage_factor: number
  groups_trained: number
  tendency: number
  is_self: boolean
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse
  }

  try {
    const region = parseRegionFilter(request.nextUrl.searchParams.get("region"))
    const gender = parseGenderFilter(request.nextUrl.searchParams.get("gender"))
    const ageRange = parseAgeRangeFilter(request.nextUrl.searchParams.get("age_range"))

    const adminClient = createAdminClient()
    const { data: athleteProfile, error: athleteProfileError } = await adminClient
      .from("profiles")
      .select("id, gym_id, nickname, birth_date, gender")
      .eq("id", sessionOrResponse.userId)
      .maybeSingle()

    if (athleteProfileError) {
      console.error("GET /api/client/rankings/regional athlete profile error:", athleteProfileError)
      return NextResponse.json({ error: "Error al obtener perfil del atleta" }, { status: 500 })
    }

    const authenticatedProfile = (athleteProfile ?? null) as AthleteProfileLookupRow | null
    if (!authenticatedProfile?.gym_id) {
      return NextResponse.json({ error: "Perfil o gimnasio no encontrado" }, { status: 404 })
    }

    const { data: rankingRows, error: rankingError } = await adminClient
      .from("regional_rankings")
      .select("athlete_id, gym_id, region, final_score, coverage_factor, groups_trained, rank_position, previous_rank")
      .eq("gym_id", authenticatedProfile.gym_id)
      .eq("region", region)
      .order("rank_position", { ascending: true })

    if (rankingError) {
      console.error("GET /api/client/rankings/regional ranking query error:", rankingError)
      return NextResponse.json({ error: "Error al obtener ranking regional" }, { status: 500 })
    }

    const rows = (rankingRows ?? []) as RegionalRankingRow[]
    const athleteIds = Array.from(new Set(rows.map((row) => row.athlete_id).filter(Boolean)))

    const profileMap = new Map<string, AthleteProfileLookupRow>()
    if (athleteIds.length > 0) {
      const { data: profilesData, error: profilesError } = await adminClient
        .from("profiles")
        .select("id, gym_id, nickname, birth_date, gender")
        .in("id", athleteIds)

      if (profilesError) {
        console.error("GET /api/client/rankings/regional profiles query error:", profilesError)
        return NextResponse.json({ error: "Error al obtener perfiles del ranking" }, { status: 500 })
      }

      for (const profile of ((profilesData ?? []) as AthleteProfileLookupRow[])) {
        profileMap.set(profile.id, profile)
      }
    }

    const filteredRows = rows.flatMap((row) => {
      const profile = profileMap.get(row.athlete_id) ?? null
      if (profile && profile.gym_id && profile.gym_id !== authenticatedProfile.gym_id) {
        return []
      }

      if (!matchesGenderFilter(profile, gender)) {
        return []
      }

      if (!matchesAgeRangeFilter(profile, ageRange)) {
        return []
      }

      const entry: RegionalLeaderboardEntry = {
        athlete_id: row.athlete_id,
        rank_position: normalizeRank(row.rank_position),
        previous_rank: normalizeRank(row.previous_rank),
        nickname: normalizeNickname(profile?.nickname),
        final_score: normalizeNumber(row.final_score),
        coverage_factor: normalizeNumber(row.coverage_factor),
        groups_trained: normalizeNumber(row.groups_trained),
        tendency: calculateTendency(row.previous_rank, row.rank_position),
        is_self: row.athlete_id === sessionOrResponse.userId,
      }

      return [entry]
    })

    const entries = filteredRows.slice(0, LEADERBOARD_LIMIT)
    const self = filteredRows.find((entry) => entry.athlete_id === sessionOrResponse.userId) ?? null

    return NextResponse.json({
      entries,
      self,
      filters: {
        gender,
        age_range: ageRange,
        region,
      },
    })
  } catch (error: unknown) {
    console.error("GET /api/client/rankings/regional unexpected error:", error)
    const message = error instanceof Error ? error.message : "Error interno del servidor"
    const status =
      message.startsWith("Parametro region invalido") ||
      message.startsWith("Parametro gender invalido") ||
      message.startsWith("Parametro age_range invalido")
        ? 400
        : 500

    return NextResponse.json({ error: message }, { status })
  }
}
