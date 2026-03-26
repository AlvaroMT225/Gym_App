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
  TablesUpdate,
} from "@/lib/supabase/types/database"
import { routinePatchBodySchema } from "@/lib/validations/athlete"
import { ensureGuidedQrWorkoutSession } from "@/lib/workout-session-lifecycle"

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

function mapRoutineRow(routine: RoutineRow): RoutineDto {
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
    canEdit: false,
    canDelete: false,
    daysPerWeek: routine.days_per_week,
    difficultyLevel: routine.difficulty_level,
    updatedAt: routine.updated_at,
    items,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: routineId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient(request)
    const userId = sessionOrResponse.userId

    const { data: routine, error: routineError } = await supabase
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
      .eq("id", routineId)
      .eq("profile_id", userId)
      .maybeSingle()

    if (routineError) {
      console.error("GET /api/client/routines/[id] query error:", routineError)
      return NextResponse.json({ error: "Error al obtener rutina" }, { status: 500 })
    }

    if (!routine) {
      return NextResponse.json({ error: "Rutina no encontrada" }, { status: 404 })
    }

    const mappedRoutine = mapRoutineRow(routine as RoutineRow)
    const athleteOwned = isAthleteOwnedRoutine(routine as RoutineRow, userId)

    return NextResponse.json({
      routine: {
        ...mappedRoutine,
        canEdit: athleteOwned,
        canDelete: athleteOwned,
      },
    })
  } catch (error) {
    console.error("GET /api/client/routines/[id] unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: routineId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient(request)
    const userId = sessionOrResponse.userId

    const [{ data: profile, error: profileError }, { data: routine, error: routineError }] =
      await Promise.all([
        supabase.from("profiles").select("gym_id").eq("id", userId).maybeSingle(),
        supabase
          .from("routines")
          .select("id")
          .eq("id", routineId)
          .eq("profile_id", userId)
          .eq("is_active", true)
          .maybeSingle(),
      ])

    if (profileError) {
      console.error("POST /api/client/routines/[id] profile error:", profileError)
      return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 })
    }

    if (routineError) {
      console.error("POST /api/client/routines/[id] routine error:", routineError)
      return NextResponse.json({ error: "Error al iniciar rutina" }, { status: 500 })
    }

    if (!routine) {
      return NextResponse.json({ error: "Rutina no encontrada" }, { status: 404 })
    }

    if (!profile?.gym_id) {
      return NextResponse.json({ error: "Perfil sin gimnasio asignado" }, { status: 400 })
    }

    const activeSession = await ensureGuidedQrWorkoutSession({
      supabase,
      athleteId: userId,
      gymId: profile.gym_id,
      routineId,
      startedAt: new Date().toISOString(),
      startMode: "explicit_start",
    })

    return NextResponse.json({
      success: true,
      workout_session_id: activeSession.workoutSessionId,
      started_at: activeSession.startedAt,
      created: activeSession.created,
    })
  } catch (error) {
    console.error("POST /api/client/routines/[id] unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: routineId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const body = await request.json().catch(() => null)
  if (body === null) {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parsedBody = routinePatchBodySchema.safeParse(body)
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

    const { data: existingRoutine, error: existingRoutineError } = await fetchAthleteOwnedRoutineForWrite(
      supabase,
      routineId,
      userId
    )

    if (existingRoutineError) {
      console.error("PATCH /api/client/routines/[id] fetch routine error:", existingRoutineError)
      return NextResponse.json({ error: "Error al obtener rutina" }, { status: 500 })
    }

    if (!existingRoutine) {
      return NextResponse.json({ error: "Rutina editable no encontrada" }, { status: 404 })
    }

    if (parsedBody.data.exercises) {
      const exerciseValidation = await validateRoutineExerciseIds(
        supabase,
        parsedBody.data.exercises.map((exercise) => exercise.exercise_id)
      )

      if (exerciseValidation.error) {
        console.error("PATCH /api/client/routines/[id] exercise validation error:", exerciseValidation.error)
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
    }

    const routineUpdate: TablesUpdate<"routines"> = {
      updated_at: new Date().toISOString(),
    }

    if (parsedBody.data.name !== undefined) {
      routineUpdate.name = parsedBody.data.name
    }

    if (Object.prototype.hasOwnProperty.call(parsedBody.data, "description")) {
      routineUpdate.description = normalizeNullableText(parsedBody.data.description)
    }

    const { error: updateRoutineError } = await supabase
      .from("routines")
      .update(routineUpdate)
      .eq("id", routineId)
      .eq("profile_id", userId)
      .eq("created_by", userId)
      .eq("is_template", false)

    if (updateRoutineError) {
      console.error("PATCH /api/client/routines/[id] update routine error:", updateRoutineError)
      return NextResponse.json({ error: "Error al actualizar rutina" }, { status: 500 })
    }

    if (parsedBody.data.exercises) {
      const { error: deleteExercisesError } = await supabase
        .from("routine_exercises")
        .delete()
        .eq("routine_id", routineId)

      if (deleteExercisesError) {
        console.error("PATCH /api/client/routines/[id] delete exercises error:", deleteExercisesError)
        return NextResponse.json({ error: "Error al reemplazar ejercicios de la rutina" }, { status: 500 })
      }

      const routineExercises: RoutineExerciseInsert[] = parsedBody.data.exercises.map((exercise) => ({
        routine_id: routineId,
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
        console.error("PATCH /api/client/routines/[id] create exercises error:", createExercisesError)
        return NextResponse.json({ error: "Error al guardar ejercicios de la rutina" }, { status: 500 })
      }
    }

    const { data: routine, error: routineError } = await fetchAthleteOwnedRoutineForWrite(
      supabase,
      routineId,
      userId
    )

    if (routineError) {
      console.error("PATCH /api/client/routines/[id] fetch updated routine error:", routineError)
      return NextResponse.json({ error: "Error al obtener rutina actualizada" }, { status: 500 })
    }

    if (!routine) {
      return NextResponse.json({ error: "Rutina actualizada no encontrada" }, { status: 500 })
    }

    return NextResponse.json({
      routine: mapRoutineWriteDto(routine, userId),
    })
  } catch (error) {
    console.error("PATCH /api/client/routines/[id] unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: routineId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient(request)
    const userId = sessionOrResponse.userId

    const { data: existingRoutine, error: existingRoutineError } = await fetchAthleteOwnedRoutineForWrite(
      supabase,
      routineId,
      userId
    )

    if (existingRoutineError) {
      console.error("DELETE /api/client/routines/[id] fetch routine error:", existingRoutineError)
      return NextResponse.json({ error: "Error al obtener rutina" }, { status: 500 })
    }

    if (!existingRoutine) {
      return NextResponse.json({ error: "Rutina eliminable no encontrada" }, { status: 404 })
    }

    const { error: deleteRoutineError } = await supabase
      .from("routines")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", routineId)
      .eq("profile_id", userId)
      .eq("created_by", userId)
      .eq("is_template", false)

    if (deleteRoutineError) {
      console.error("DELETE /api/client/routines/[id] soft delete error:", deleteRoutineError)
      return NextResponse.json({ error: "Error al eliminar rutina" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      id: routineId,
      is_active: false,
    })
  } catch (error) {
    console.error("DELETE /api/client/routines/[id] unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
