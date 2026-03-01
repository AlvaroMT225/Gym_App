import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { requireActiveConsent, requireConsentScope } from "@/lib/consent-guards"
import { createClient } from "@/lib/supabase/server"

/* ---------- DB row shapes ---------- */

interface ExerciseRow {
  id: string
  name: string
}

interface RoutineExerciseRow {
  id: string
  order_index: number
  sets_target: number
  reps_target: number
  rest_seconds: number
  notes: string | null
  exercise: ExerciseRow | ExerciseRow[] | null
}

interface RoutineRow {
  id: string
  name: string
  days_per_week: number
  difficulty_level: number
  updated_at: string
  routine_exercises: RoutineExerciseRow[] | null
}

interface ProposalRow {
  id: string
  title: string
  updated_at: string
  content: Record<string, unknown>
}

/* ---------- helpers ---------- */

function normalizeExercise(ex: RoutineExerciseRow["exercise"]): ExerciseRow | null {
  if (!ex) return null
  if (Array.isArray(ex)) return ex[0] ?? null
  return ex
}

const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Principiante",
  2: "Intermedio",
  3: "Avanzado",
  4: "Elite",
}

function mapRoutineRow(routine: RoutineRow) {
  const exercises = [...(routine.routine_exercises ?? [])]
    .sort((a, b) => a.order_index - b.order_index)
    .map((item) => {
      const ex = normalizeExercise(item.exercise)
      return {
        id: item.id,
        name: ex?.name ?? "Ejercicio",
        sets: item.sets_target,
        reps: item.reps_target,
        restSec: item.rest_seconds,
        ...(item.notes ? { notes: item.notes } : {}),
      }
    })

  return {
    id: routine.id,
    title: routine.name,
    updatedAt: routine.updated_at,
    weeks: routine.days_per_week,
    progression: DIFFICULTY_LABELS[routine.difficulty_level] ?? "",
    exercises,
  }
}

function mapProposalRow(proposal: ProposalRow) {
  const content = proposal.content ?? {}
  return {
    id: proposal.id,
    title: proposal.title,
    updatedAt: proposal.updated_at,
    weeks: (content.weeks as number) ?? 0,
    progression: (content.progression as string) ?? "",
    exercises: (content.exercises as unknown[]) ?? [],
  }
}

/* ---------- GET ---------- */

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

    const scopeResult = requireConsentScope(consentResult.consent, "view_routines")
    if ("error" in scopeResult) return scopeResult.error

    const [
      { data: routineData, error: routineError },
      { data: proposalData, error: proposalError },
    ] = await Promise.all([
      supabase
        .from("routines")
        .select(`
          id,
          name,
          days_per_week,
          difficulty_level,
          updated_at,
          routine_exercises(
            id,
            order_index,
            sets_target,
            reps_target,
            rest_seconds,
            notes,
            exercise:exercises(id, name)
          )
        `)
        .eq("profile_id", clientId)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("proposals")
        .select("id, title, updated_at, content")
        .eq("coach_id", coachId)
        .eq("athlete_id", clientId)
        .eq("type", "routine")
        .eq("status", "sent")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (routineError) {
      console.error("GET /api/trainer/clients/[clientId]/routine routines query error:", routineError)
      return NextResponse.json({ error: "Error al obtener rutina activa" }, { status: 500 })
    }

    if (proposalError) {
      console.error("GET /api/trainer/clients/[clientId]/routine proposals query error:", proposalError)
      return NextResponse.json({ error: "Error al obtener propuesta" }, { status: 500 })
    }

    const active = routineData ? mapRoutineRow(routineData as unknown as RoutineRow) : null
    const proposal = proposalData ? mapProposalRow(proposalData as unknown as ProposalRow) : null

    return NextResponse.json({ active, proposal })
  } catch (err) {
    console.error("GET /api/trainer/clients/[clientId]/routine unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
