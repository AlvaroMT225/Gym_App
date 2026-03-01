import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { requireActiveConsent, requireConsentScope } from "@/lib/consent-guards"
import { createClient } from "@/lib/supabase/server"

interface ExerciseRow {
  id: string
  name: string
}

interface PRRow {
  exercise_id: string
  value: number
  achieved_at: string
  exercise: ExerciseRow | ExerciseRow[] | null
}

function normalizeExercise(ex: PRRow["exercise"]): ExerciseRow | null {
  if (!ex) return null
  return Array.isArray(ex) ? (ex[0] ?? null) : ex
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const coachId = sessionOrResponse.userId

  try {
    const supabase = await createClient()

    const consentResult = await requireActiveConsent(supabase, coachId, clientId)
    if ("error" in consentResult) return consentResult.error

    const scopeResult = requireConsentScope(consentResult.consent, "view_personal_records")
    if ("error" in scopeResult) return scopeResult.error

    const { data, error } = await supabase
      .from("personal_records")
      .select("exercise_id, value, achieved_at, exercise:exercises(id, name)")
      .eq("profile_id", clientId)
      .eq("record_type", "1rm")
      .order("value", { ascending: false })

    if (error) {
      console.error("GET /api/trainer/clients/[clientId]/prs query error:", error)
      return NextResponse.json({ error: "Error al obtener records personales" }, { status: 500 })
    }

    // Keep only the best value per exercise (the trigger only inserts on new PRs, so
    // the highest value row is the current record — dedup here for safety)
    const bestByExercise = new Map<
      string,
      { value: number; achievedAt: string; exerciseName: string }
    >()

    for (const row of (data ?? []) as PRRow[]) {
      const existing = bestByExercise.get(row.exercise_id)
      if (!existing || row.value > existing.value) {
        const exercise = normalizeExercise(row.exercise)
        bestByExercise.set(row.exercise_id, {
          value: row.value,
          achievedAt: row.achieved_at,
          exerciseName: exercise?.name ?? row.exercise_id,
        })
      }
    }

    const prs = Array.from(bestByExercise.entries()).map(([exerciseId, pr]) => ({
      exerciseId,
      exerciseName: pr.exerciseName,
      bestWeight: pr.value,
      date: pr.achievedAt,
    }))

    return NextResponse.json({ prs })
  } catch (err) {
    console.error("GET /api/trainer/clients/[clientId]/prs unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
