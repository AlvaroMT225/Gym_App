import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

interface ChallengeAvailabilityRow {
  id: string
  gym_id: string | null
}

interface UserChallengeStateRow {
  id: string
  challenge_id: string
  profile_id: string
  current_value: number | null
  completed: boolean | null
}

function toNonNegativeNumber(value: number | null | undefined): number {
  const parsed = Number(value ?? 0)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, parsed)
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505"
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient(request)
    const athleteId = sessionOrResponse.userId
    const { id: challengeId } = await context.params

    if (!challengeId) {
      return NextResponse.json({ error: "Reto inválido" }, { status: 404 })
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", athleteId)
      .maybeSingle()

    if (profileError) {
      console.error("POST /api/client/challenges/[id]/join profile error:", profileError)
      return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 })
    }

    if (!profile?.gym_id) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })
    }

    const today = new Date().toISOString().split("T")[0]

    const { data: challenge, error: challengeError } = await supabase
      .from("challenges")
      .select("id, gym_id")
      .eq("id", challengeId)
      .eq("gym_id", profile.gym_id)
      .eq("is_active", true)
      .lte("start_date", today)
      .gte("end_date", today)
      .maybeSingle()

    if (challengeError) {
      console.error("POST /api/client/challenges/[id]/join challenge error:", challengeError)
      return NextResponse.json({ error: "Error al obtener reto" }, { status: 500 })
    }

    if (!(challenge as ChallengeAvailabilityRow | null)?.id) {
      return NextResponse.json({ error: "Reto no disponible" }, { status: 404 })
    }

    const { data: existingJoin, error: existingJoinError } = await supabase
      .from("user_challenges")
      .select("id, challenge_id, profile_id, current_value, completed")
      .eq("profile_id", athleteId)
      .eq("challenge_id", challengeId)
      .maybeSingle()

    if (existingJoinError) {
      console.error("POST /api/client/challenges/[id]/join existing row error:", existingJoinError)
      return NextResponse.json({ error: "Error al validar inscripción" }, { status: 500 })
    }

    if (existingJoin) {
      const row = existingJoin as UserChallengeStateRow
      return NextResponse.json({
        joined: true,
        already_joined: true,
        challenge_id: challengeId,
        current_value: toNonNegativeNumber(row.current_value),
        completed: row.completed === true,
      })
    }

    const { data: insertedRow, error: insertError } = await supabase
      .from("user_challenges")
      .insert({
        profile_id: athleteId,
        challenge_id: challengeId,
        current_value: 0,
        completed: false,
      })
      .select("id, challenge_id, profile_id, current_value, completed")
      .maybeSingle()

    if (insertError && !isUniqueViolation(insertError)) {
      console.error("POST /api/client/challenges/[id]/join insert error:", insertError)
      return NextResponse.json({ error: "Error al unirse al reto" }, { status: 500 })
    }

    if (insertError && isUniqueViolation(insertError)) {
      const { data: raceWinnerRow, error: raceWinnerError } = await supabase
        .from("user_challenges")
        .select("id, challenge_id, profile_id, current_value, completed")
        .eq("profile_id", athleteId)
        .eq("challenge_id", challengeId)
        .maybeSingle()

      if (raceWinnerError) {
        console.error("POST /api/client/challenges/[id]/join race read error:", raceWinnerError)
        return NextResponse.json({ error: "Error al validar inscripción" }, { status: 500 })
      }

      const row = raceWinnerRow as UserChallengeStateRow | null
      return NextResponse.json({
        joined: true,
        already_joined: true,
        challenge_id: challengeId,
        current_value: toNonNegativeNumber(row?.current_value),
        completed: row?.completed === true,
      })
    }

    const row = insertedRow as UserChallengeStateRow | null
    return NextResponse.json(
      {
        joined: true,
        already_joined: false,
        challenge_id: challengeId,
        current_value: toNonNegativeNumber(row?.current_value),
        completed: row?.completed === true,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("POST /api/client/challenges/[id]/join unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
