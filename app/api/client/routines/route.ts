import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

interface ExerciseRow {
  id: string
  name: string
  muscle_groups: string[] | null
  machine_id: string | null
}

interface RoutineExerciseRow {
  id: string
  exercise_id: string
  order_index: number
  sets_target: number
  reps_target: number
  weight_target: number | null
  rest_seconds: number
  notes: string | null
  exercise: ExerciseRow | ExerciseRow[] | null
}

interface RoutineRow {
  id: string
  name: string
  description: string | null
  is_active: boolean
  days_per_week: number
  difficulty_level: number
  updated_at: string
  routine_exercises: RoutineExerciseRow[] | null
}

interface RoutineItemDto {
  id: string
  orderIndex: number
  exerciseId: string
  exerciseName: string | null
  muscleGroups: string[] | null
  machineId: string | null
  setsTarget: number
  repsTarget: number
  weightTarget: number | null
  restSeconds: number
  notes: string | null
}

interface RoutineDto {
  id: string
  name: string
  description: string | null
  isActive: boolean
  daysPerWeek: number
  difficultyLevel: number
  updatedAt: string
  items: RoutineItemDto[]
}

function normalizeExercise(
  exercise: RoutineExerciseRow["exercise"]
): ExerciseRow | null {
  if (!exercise) return null
  if (Array.isArray(exercise)) return exercise[0] ?? null
  return exercise
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient(request)
    const userId = sessionOrResponse.userId

    const { data: routines, error: routinesError } = await supabase
      .from("routines")
      .select(`
        id,
        name,
        description,
        is_active,
        days_per_week,
        difficulty_level,
        updated_at,
        routine_exercises(
          id,
          exercise_id,
          order_index,
          sets_target,
          reps_target,
          weight_target,
          rest_seconds,
          notes,
          exercise:exercises(
            id,
            name,
            muscle_groups,
            machine_id
          )
        )
      `)
      .eq("profile_id", userId)
      .order("updated_at", { ascending: false })

    if (routinesError) {
      console.error("GET /api/client/routines query error:", routinesError)
      return NextResponse.json({ error: "Error al obtener rutinas" }, { status: 500 })
    }

    const routineRows = (routines ?? []) as RoutineRow[]
    const routineList: RoutineDto[] = routineRows.map((routine) => {
      const items = [...(routine.routine_exercises ?? [])]
        .sort((a, b) => a.order_index - b.order_index)
        .map((item) => {
          const exercise = normalizeExercise(item.exercise)
          return {
            id: item.id,
            orderIndex: item.order_index,
            exerciseId: item.exercise_id,
            exerciseName: exercise?.name ?? null,
            muscleGroups: exercise?.muscle_groups ?? null,
            machineId: exercise?.machine_id ?? null,
            setsTarget: item.sets_target,
            repsTarget: item.reps_target,
            weightTarget: item.weight_target,
            restSeconds: item.rest_seconds,
            notes: item.notes,
          }
        })

      return {
        id: routine.id,
        name: routine.name,
        description: routine.description,
        isActive: routine.is_active,
        daysPerWeek: routine.days_per_week,
        difficultyLevel: routine.difficulty_level,
        updatedAt: routine.updated_at,
        items,
      }
    })

    const activeRoutineId = routineRows.find((routine) => routine.is_active)?.id ?? null

    return NextResponse.json({
      routines: routineList,
      activeRoutineId,
    })
  } catch (error) {
    console.error("GET /api/client/routines unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
