import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { requireActiveConsent, requireConsentScope } from "@/lib/consent-guards"
import { createClient } from "@/lib/supabase/server"

/* ---------- row types ---------- */

interface MachineRow {
  name: string
}

interface ExerciseRow {
  id: string
  name: string
  muscle_groups: string[] | null
  machine: MachineRow | MachineRow[] | null
}

interface WorkoutSetRow {
  id: string
  set_number: number | null
  weight_kg: number | null
  reps_done: number | null
  rpe: number | null
  exercise: ExerciseRow | ExerciseRow[] | null
}

interface SessionCommentRow {
  id: string
  content: string
  created_at: string
}

interface WorkoutSessionRow {
  id: string
  started_at: string
  notes: string | null
  workout_sets: WorkoutSetRow[] | null
  session_comments: SessionCommentRow[] | null
}

/* ---------- helpers ---------- */

function normalizeOne<T>(val: T | T[] | null): T | null {
  if (!val) return null
  return Array.isArray(val) ? (val[0] ?? null) : val
}

/* ---------- route ---------- */

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

    const scopeResult = requireConsentScope(consentResult.consent, "view_progress")
    if ("error" in scopeResult) return scopeResult.error

    const { data, error } = await supabase
      .from("workout_sessions")
      .select(`
        id,
        started_at,
        notes,
        workout_sets(
          id,
          set_number,
          weight_kg,
          reps_done,
          rpe,
          exercise:exercises(
            id,
            name,
            muscle_groups,
            machine:machines(name)
          )
        ),
        session_comments(id, content, created_at)
      `)
      .eq("profile_id", clientId)
      .order("started_at", { ascending: false })

    if (error) {
      console.error("GET /api/trainer/clients/[clientId]/sessions query error:", error)
      return NextResponse.json({ error: "Error al obtener sesiones" }, { status: 500 })
    }

    // Global metrics accumulators
    let totalVolume = 0
    let totalReps = 0
    let totalRpeSum = 0
    let totalSetsWithRpe = 0

    const sessions = ((data ?? []) as WorkoutSessionRow[]).map((session) => {
      const sets = [...(session.workout_sets ?? [])].sort(
        (a, b) => (a.set_number ?? 0) - (b.set_number ?? 0)
      )

      // Primary exercise from first set
      const firstSet = sets[0] ?? null
      const exerciseRow = normalizeOne(firstSet?.exercise ?? null)
      const machineRow = normalizeOne(exerciseRow?.machine ?? null)

      const exercise = {
        id: exerciseRow?.id ?? "",
        name: exerciseRow?.name ?? "Ejercicio",
        muscles: exerciseRow?.muscle_groups ?? [],
        machine: machineRow?.name ?? "",
      }

      const mappedSets = sets.map((s) => {
        const weight = Number(s.weight_kg ?? 0)
        const reps = Number(s.reps_done ?? 0)
        const rpe = s.rpe != null ? Number(s.rpe) : 0

        totalVolume += weight * reps
        totalReps += reps
        if (s.rpe != null) {
          totalRpeSum += Number(s.rpe)
          totalSetsWithRpe++
        }

        return { weight, reps, rpe }
      })

      const comments = (session.session_comments ?? []).map((c) => ({
        id: c.id,
        comment: c.content,
        createdAt: c.created_at,
      }))

      return {
        id: session.id,
        date: session.started_at,
        source: session.notes === "qr" ? "qr" : "manual",
        exercise,
        sets: mappedSets,
        comments,
      }
    })

    return NextResponse.json({
      sessions,
      metrics: {
        totalVolume,
        totalReps,
        avgRpe: totalSetsWithRpe > 0 ? totalRpeSum / totalSetsWithRpe : 0,
      },
    })
  } catch (err) {
    console.error("GET /api/trainer/clients/[clientId]/sessions unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
