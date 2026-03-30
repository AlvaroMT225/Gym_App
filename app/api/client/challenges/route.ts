import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

const DAY_IN_MS = 24 * 60 * 60 * 1000

const TARGET_TYPE_UNIT: Record<string, string> = {
  sessions: "sesiones",
  volume: "kg",
  streak: "dias",
  reps: "reps",
  sets: "sets",
}

interface ChallengeDto {
  id: string
  title: string
  description: string | null
  target_type: string | null
  target_value: number
  start_date: string
  end_date: string
  points_reward: number
  current_value: number
  completed: boolean
  progress_pct: number
  days_remaining: number
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
  start_date: string
  end_date: string
  target_value: number | null
  target_type: string | null
  points_reward: number | null
  is_active: boolean | null
}

interface UserChallengeRow {
  challenge_id: string
  current_value: number | null
  completed: boolean | null
}

function toNonNegativeNumber(value: number | null | undefined): number {
  const parsed = Number(value ?? 0)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, parsed)
}

function toFiniteProgressPercentage(currentValue: number, targetValue: number): number {
  if (targetValue <= 0) return 0

  const pct = (currentValue / targetValue) * 100
  if (!Number.isFinite(pct)) return 0

  return Math.min(100, Number(pct.toFixed(2)))
}

function parseDateOnlyAsUtcEnd(dateValue: string): Date | null {
  const [year, month, day] = dateValue.split("-").map(Number)
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null
  }

  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
}

function computeDaysRemaining(endDate: string, now: Date): number {
  const endAt = parseDateOnlyAsUtcEnd(endDate)
  if (!endAt) return 0
  return Math.max(0, Math.ceil((endAt.getTime() - now.getTime()) / DAY_IN_MS))
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient(request)
    const athleteId = sessionOrResponse.userId

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", athleteId)
      .maybeSingle()

    if (profileError) {
      console.error("GET /api/client/challenges profile error:", profileError)
      return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 })
    }

    if (!profile?.gym_id) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })
    }

    const gymId = profile.gym_id
    const today = new Date().toISOString().split("T")[0]

    const { data: challengesData, error: challengesError } = await supabase
      .from("challenges")
      .select(
        "id, title, description, start_date, end_date, target_value, target_type, points_reward, is_active"
      )
      .eq("gym_id", gymId)
      .eq("is_active", true)
      .lte("start_date", today)
      .gte("end_date", today)

    if (challengesError) {
      console.error("GET /api/client/challenges challenges error:", challengesError)
      return NextResponse.json({ error: "Error al obtener retos" }, { status: 500 })
    }

    const rows = (challengesData ?? []) as ChallengeRow[]
    const challengeIds = rows.map((challenge) => challenge.id)
    const progressMap = new Map<
      string,
      {
        current_value: number
        completed: boolean
      }
    >()

    if (challengeIds.length > 0) {
      const { data: userChallenges, error: userChallengesError } = await supabase
        .from("user_challenges")
        .select("challenge_id, current_value, completed")
        .eq("profile_id", athleteId)
        .in("challenge_id", challengeIds)

      if (userChallengesError) {
        console.error("GET /api/client/challenges user_challenges error:", userChallengesError)
      } else {
        for (const row of (userChallenges ?? []) as UserChallengeRow[]) {
          progressMap.set(row.challenge_id, {
            current_value: toNonNegativeNumber(row.current_value),
            completed: row.completed === true,
          })
        }
      }
    }

    const now = new Date()
    const challenges: ChallengeDto[] = rows.map((challenge) => {
      const currentState = progressMap.get(challenge.id) ?? {
        current_value: 0,
        completed: false,
      }
      const targetValue = toNonNegativeNumber(challenge.target_value)

      return {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        target_type: challenge.target_type,
        target_value: targetValue,
        start_date: challenge.start_date,
        end_date: challenge.end_date,
        points_reward: toNonNegativeNumber(challenge.points_reward),
        current_value: currentState.current_value,
        completed: currentState.completed,
        progress_pct: toFiniteProgressPercentage(currentState.current_value, targetValue),
        days_remaining: computeDaysRemaining(challenge.end_date, now),
        progress: currentState.current_value,
        goal: targetValue,
        unit: TARGET_TYPE_UNIT[challenge.target_type ?? ""] ?? (challenge.target_type ?? ""),
        endsAt: challenge.end_date,
        active: challenge.is_active === true,
      }
    })

    return NextResponse.json({ challenges })
  } catch (error) {
    console.error("GET /api/client/challenges unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
