import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

// Maps DB target_type → display unit
const TARGET_TYPE_UNIT: Record<string, string> = {
  sessions: "sesiones",
  volume: "kg",
  streak: "días",
  reps: "reps",
  sets: "sets",
}

interface ChallengeDto {
  id: string
  title: string
  description: string | null
  progress: number
  goal: number
  unit: string
  endsAt: string
  active: boolean
}

interface ChallengeRow {
  id: string
  title: string
  description: string | null
  end_date: string
  target_value: number | null
  target_type: string | null
  is_active: boolean
}

interface UserChallengeRow {
  challenge_id: string
  current_value: number | null
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
    const today = new Date().toISOString().split("T")[0]

    // Step 1: get active challenges for this gym
    const { data: challengesData, error: challengesError } = await supabase
      .from("challenges")
      .select("id, title, description, end_date, target_value, target_type, is_active")
      .eq("gym_id", gymId)
      .eq("is_active", true)
      .lte("start_date", today)
      .gte("end_date", today)

    if (challengesError) {
      console.error("GET /api/client/challenges challenges error:", challengesError)
      return NextResponse.json({ error: "Error al obtener retos" }, { status: 500 })
    }

    const rows = (challengesData ?? []) as ChallengeRow[]

    // Step 2: get this user's progress for those challenges
    const challengeIds = rows.map((c) => c.id)
    let progressMap = new Map<string, number>()

    if (challengeIds.length > 0) {
      const { data: userChallenges, error: ucError } = await supabase
        .from("user_challenges")
        .select("challenge_id, current_value")
        .eq("profile_id", userId)
        .in("challenge_id", challengeIds)

      if (ucError) {
        console.error("GET /api/client/challenges user_challenges error:", ucError)
        // Non-fatal: continue with zero progress
      } else {
        progressMap = new Map(
          ((userChallenges ?? []) as UserChallengeRow[]).map((uc) => [
            uc.challenge_id,
            Number(uc.current_value ?? 0),
          ])
        )
      }
    }

    // Step 3: merge into DTO
    const challenges: ChallengeDto[] = rows.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      progress: progressMap.get(c.id) ?? 0,
      goal: Number(c.target_value ?? 0),
      unit: TARGET_TYPE_UNIT[c.target_type ?? ""] ?? (c.target_type ?? ""),
      endsAt: c.end_date,
      active: c.is_active,
    }))

    return NextResponse.json({ challenges })
  } catch (error) {
    console.error("GET /api/client/challenges unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
