import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

const DIFFICULTY_FROM_PROGRESSION: Record<string, number> = {
  Principiante: 1,
  Intermedio: 2,
  Avanzado: 3,
  Elite: 4,
}

function isUUID(val: unknown): val is string {
  return (
    typeof val === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  // Only the athlete themselves can accept their proposal
  if (sessionOrResponse.userId !== clientId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  try {
    const supabase = await createClient()

    // Find the latest sent proposal for this athlete
    const { data: proposal, error: findError } = await supabase
      .from("proposals")
      .select("id, title, content, updated_at")
      .eq("athlete_id", clientId)
      .eq("type", "routine")
      .eq("status", "sent")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (findError) {
      console.error("POST .../routine/accept find proposal error:", findError)
      return NextResponse.json({ error: "Error al obtener propuesta" }, { status: 500 })
    }

    if (!proposal) {
      return NextResponse.json({ error: "No hay propuesta pendiente" }, { status: 404 })
    }

    const content = ((proposal.content ?? {}) as Record<string, unknown>)
    const progressionStr = (content.progression as string) ?? ""
    const difficultyLevel = DIFFICULTY_FROM_PROGRESSION[progressionStr] ?? 1
    const daysPerWeek = (content.weeks as number) ?? 4
    const exercises = Array.isArray(content.exercises)
      ? (content.exercises as Record<string, unknown>[])
      : []

    const now = new Date().toISOString()

    // 1. Mark proposal as accepted
    const { error: acceptError } = await supabase
      .from("proposals")
      .update({ status: "accepted", responded_at: now })
      .eq("id", proposal.id)

    if (acceptError) {
      console.error("POST .../routine/accept update proposal error:", acceptError)
      return NextResponse.json({ error: "Error al aceptar propuesta" }, { status: 500 })
    }

    // 2. Deactivate current active routine (non-fatal if none exists)
    await supabase
      .from("routines")
      .update({ is_active: false })
      .eq("profile_id", clientId)
      .eq("is_active", true)

    // 3. Create new active routine
    const { data: newRoutine, error: routineError } = await supabase
      .from("routines")
      .insert({
        profile_id: clientId,
        name: proposal.title,
        description: progressionStr || null,
        is_active: true,
        days_per_week: daysPerWeek,
        difficulty_level: difficultyLevel,
      })
      .select("id, name, days_per_week, difficulty_level, updated_at")
      .single()

    if (routineError || !newRoutine) {
      console.error("POST .../routine/accept insert routine error:", routineError)
      return NextResponse.json({ error: "Error al crear rutina" }, { status: 500 })
    }

    // 4. Create routine_exercises for valid exercise UUIDs
    const exerciseRows = exercises
      .filter((ex) => isUUID(ex.id))
      .map((ex, idx) => ({
        routine_id: newRoutine.id,
        exercise_id: ex.id as string,
        order_index: idx + 1,
        sets_target: Number(ex.sets ?? 3),
        reps_target: Number(ex.reps ?? 10),
        rest_seconds: Number(ex.restSec ?? 60),
        notes: ex.notes ? String(ex.notes) : null,
      }))

    if (exerciseRows.length > 0) {
      const { error: exercisesError } = await supabase
        .from("routine_exercises")
        .insert(exerciseRows)

      if (exercisesError) {
        // Non-fatal: routine row exists; log and continue
        console.error("POST .../routine/accept insert routine_exercises error:", exercisesError)
      }
    }

    return NextResponse.json({
      routine: {
        id: newRoutine.id,
        title: newRoutine.name,
        updatedAt: newRoutine.updated_at,
        weeks: newRoutine.days_per_week,
        progression: progressionStr,
        exercises: exercises.map((ex, idx) => ({
          id: String(ex.id ?? `ex-${idx}`),
          name: String(ex.name ?? "Ejercicio"),
          sets: Number(ex.sets ?? 3),
          reps: Number(ex.reps ?? 10),
          restSec: Number(ex.restSec ?? 60),
          ...(ex.notes ? { notes: String(ex.notes) } : {}),
        })),
      },
    })
  } catch (err) {
    console.error("POST .../routine/accept unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
