import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import {
  mapRoutineWriteDto,
  fetchAthleteOwnedRoutineForWrite,
  isAthleteOwnedRoutine,
  normalizeNullableText,
  validateRoutineExerciseIds,
} from "@/lib/client-routines-write"
import { createClient } from "@/lib/supabase/server"
import type {
  RoutineExerciseInsert,
  RoutineInsert,
} from "@/lib/supabase/types/database"
import { routineCreateBodySchema } from "@/lib/validations/athlete"

interface ExerciseRow {
  id: string
  name: string
  muscle_groups: string[] | null
  machine_id: string | null
  machine: { name: string | null } | { name: string | null }[] | null
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
  profile_id: string
  created_by: string | null
  is_template: boolean | null
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
  machineName: string | null
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
  canEdit: boolean
  canDelete: boolean
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

function normalizeMachine(
  machine: ExerciseRow["machine"]
): { name: string | null } | null {
  if (!machine) return null
  if (Array.isArray(machine)) return machine[0] ?? null
  return machine
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
        profile_id,
        created_by,
        is_template,
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
            machine_id,
            machine:machines(name)
          )
        )
      `)
      .eq("profile_id", userId)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })

    if (routinesError) {
      console.error("GET /api/client/routines query error:", routinesError)
      return NextResponse.json({ error: "Error al obtener rutinas" }, { status: 500 })
    }

    const routineRows = (routines ?? []) as RoutineRow[]
    const routineList: RoutineDto[] = routineRows.map((routine) => {
      const athleteOwned = isAthleteOwnedRoutine(routine, userId)
      const items = [...(routine.routine_exercises ?? [])]
        .sort((a, b) => a.order_index - b.order_index)
        .map((item) => {
          const exercise = normalizeExercise(item.exercise)
          const machine = normalizeMachine(exercise?.machine ?? null)
          return {
            id: item.id,
            orderIndex: item.order_index,
            exerciseId: item.exercise_id,
            exerciseName: exercise?.name ?? null,
            muscleGroups: exercise?.muscle_groups ?? null,
            machineId: exercise?.machine_id ?? null,
            machineName: machine?.name ?? null,
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
        canEdit: athleteOwned,
        canDelete: athleteOwned,
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

export async function POST(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const body = await request.json().catch(() => null)
  if (body === null) {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parsedBody = routineCreateBodySchema.safeParse(body)
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: "Datos de entrada inválidos",
        details: parsedBody.error.flatten(),
      },
      { status: 400 }
    )
  }

  try {
    const supabase = await createClient(request)
    const userId = sessionOrResponse.userId

    const exerciseValidation = await validateRoutineExerciseIds(
      supabase,
      parsedBody.data.exercises.map((exercise) => exercise.exercise_id)
    )

    if (exerciseValidation.error) {
      console.error("POST /api/client/routines exercise validation error:", exerciseValidation.error)
      return NextResponse.json({ error: "Error al validar ejercicios" }, { status: 500 })
    }

    if (!exerciseValidation.ok) {
      return NextResponse.json(
        {
          error: "Uno o más ejercicios no existen o no están disponibles",
          invalid_exercise_ids: exerciseValidation.missingIds,
        },
        { status: 400 }
      )
    }

    const routineInsert: RoutineInsert = {
      name: parsedBody.data.name,
      description: normalizeNullableText(parsedBody.data.description),
      profile_id: userId,
      created_by: userId,
      is_template: false,
      is_active: true,
    }

    const { data: createdRoutine, error: createRoutineError } = await supabase
      .from("routines")
      .insert(routineInsert)
      .select("id")
      .single()

    if (createRoutineError || !createdRoutine) {
      console.error("POST /api/client/routines create error:", createRoutineError)
      return NextResponse.json({ error: "Error al crear rutina" }, { status: 500 })
    }

    const routineExercises: RoutineExerciseInsert[] = parsedBody.data.exercises.map((exercise) => ({
      routine_id: createdRoutine.id,
      exercise_id: exercise.exercise_id,
      order_index: exercise.order_index,
      sets_target: exercise.sets_target,
      reps_target: exercise.reps_target,
      rest_seconds: exercise.rest_seconds ?? null,
      weight_target: exercise.weight_target ?? null,
      notes: normalizeNullableText(exercise.notes),
    }))

    const { error: createExercisesError } = await supabase
      .from("routine_exercises")
      .insert(routineExercises)

    if (createExercisesError) {
      console.error("POST /api/client/routines exercises create error:", createExercisesError)

      const { error: rollbackError } = await supabase
        .from("routines")
        .delete()
        .eq("id", createdRoutine.id)
        .eq("profile_id", userId)

      if (rollbackError) {
        console.error("POST /api/client/routines rollback error:", rollbackError)
      }

      return NextResponse.json(
        { error: "Error al crear ejercicios de la rutina" },
        { status: 500 }
      )
    }

    const { data: routine, error: routineError } = await fetchAthleteOwnedRoutineForWrite(
      supabase,
      createdRoutine.id,
      userId
    )

    if (routineError) {
      console.error("POST /api/client/routines fetch created routine error:", routineError)
      return NextResponse.json({ error: "Error al obtener rutina creada" }, { status: 500 })
    }

    if (!routine) {
      return NextResponse.json({ error: "Rutina creada no encontrada" }, { status: 500 })
    }

    return NextResponse.json(
      {
        routine: mapRoutineWriteDto(routine, userId),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("POST /api/client/routines unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
