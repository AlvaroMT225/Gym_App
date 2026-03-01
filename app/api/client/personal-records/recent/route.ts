import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

interface ExerciseRow {
  id: string
  name: string
  muscle_groups: string[] | null
  machine_id: string | null
}

interface PersonalRecordRow {
  id: string
  exercise_id: string
  record_type: string
  value: number
  previous_value: number | null
  achieved_at: string
  exercise: ExerciseRow | ExerciseRow[] | null
}

interface PersonalRecordDto {
  id: string
  exerciseId: string
  exerciseName: string | null
  muscleGroups: string[] | null
  machineId: string | null
  recordType: string
  value: number
  previousValue: number | null
  achievedAt: string
}

function normalizeExercise(exercise: PersonalRecordRow["exercise"]): ExerciseRow | null {
  if (!exercise) return null
  if (Array.isArray(exercise)) return exercise[0] ?? null
  return exercise
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const userId = sessionOrResponse.userId

    const { data, error } = await supabase
      .from("personal_records")
      .select(
        `
        id,
        exercise_id,
        record_type,
        value,
        previous_value,
        achieved_at,
        exercise:exercises(
          id,
          name,
          muscle_groups,
          machine_id
        )
      `
      )
      .eq("profile_id", userId)
      .order("achieved_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("GET /api/client/personal-records/recent query error:", error)
      return NextResponse.json({ error: "Error al obtener records personales" }, { status: 500 })
    }

    const records: PersonalRecordDto[] = ((data ?? []) as PersonalRecordRow[]).map((record) => {
      const exercise = normalizeExercise(record.exercise)
      return {
        id: record.id,
        exerciseId: record.exercise_id,
        exerciseName: exercise?.name ?? null,
        muscleGroups: exercise?.muscle_groups ?? null,
        machineId: exercise?.machine_id ?? null,
        recordType: record.record_type,
        value: record.value,
        previousValue: record.previous_value,
        achievedAt: record.achieved_at,
      }
    })

    return NextResponse.json({ records })
  } catch (error) {
    console.error("GET /api/client/personal-records/recent unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
