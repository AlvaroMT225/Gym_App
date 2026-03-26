import type { createClient } from "@/lib/supabase/server"

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

interface RoutineExerciseWriteRow {
  id: string
  exercise_id: string
  order_index: number | null
  sets_target: number | null
  reps_target: number | null
  rest_seconds: number | null
  weight_target: number | null
  notes: string | null
  exercise:
    | {
        id: string
        name: string | null
        muscle_groups: string[] | null
        machine_id: string | null
        machine: { name: string | null } | { name: string | null }[] | null
      }
    | Array<{
        id: string
        name: string | null
        muscle_groups: string[] | null
        machine_id: string | null
        machine: { name: string | null } | { name: string | null }[] | null
      }>
    | null
}

interface RoutineWriteRow {
  id: string
  name: string
  description: string | null
  profile_id: string
  created_by: string | null
  is_template: boolean | null
  is_active: boolean | null
  days_per_week: number | null
  difficulty_level: number | null
  updated_at: string | null
  routine_exercises: RoutineExerciseWriteRow[] | null
}

export interface RoutineResponseDto {
  id: string
  name: string
  description: string | null
  isActive: boolean
  canEdit: boolean
  canDelete: boolean
  daysPerWeek: number | null
  difficultyLevel: number | null
  updatedAt: string | null
  items: Array<{
    id: string
    orderIndex: number
    exerciseId: string
    exerciseName: string | null
    muscleGroups: string[] | null
    machineId: string | null
    machineName: string | null
    setsTarget: number
    repsTarget: number
    restSeconds: number | null
    weightTarget: number | null
    notes: string | null
  }>
}

export function normalizeNullableText(value: string | null | undefined) {
  if (value === null || value === undefined) return null

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function isAthleteOwnedRoutine(routine: {
  profile_id: string
  created_by: string | null
  is_template: boolean | null
}, userId: string) {
  return (
    routine.profile_id === userId &&
    routine.created_by === userId &&
    routine.is_template === false
  )
}

export function mapRoutineWriteDto(
  routine: RoutineWriteRow,
  userId: string
): RoutineResponseDto {
  const athleteOwned = isAthleteOwnedRoutine(routine, userId)

  return {
    id: routine.id,
    name: routine.name,
    description: routine.description,
    isActive: routine.is_active === true,
    canEdit: athleteOwned,
    canDelete: athleteOwned,
    daysPerWeek: routine.days_per_week,
    difficultyLevel: routine.difficulty_level,
    updatedAt: routine.updated_at,
    items: [...(routine.routine_exercises ?? [])]
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map((exercise) => ({
        id: exercise.id,
        orderIndex: exercise.order_index ?? 0,
        exerciseId: exercise.exercise_id,
        exerciseName: normalizeExercise(exercise.exercise)?.name ?? null,
        muscleGroups: normalizeExercise(exercise.exercise)?.muscle_groups ?? null,
        machineId: normalizeExercise(exercise.exercise)?.machine_id ?? null,
        machineName: normalizeMachine(normalizeExercise(exercise.exercise)?.machine ?? null)?.name ?? null,
        setsTarget: exercise.sets_target ?? 0,
        repsTarget: exercise.reps_target ?? 0,
        restSeconds: exercise.rest_seconds,
        weightTarget: exercise.weight_target,
        notes: exercise.notes,
      })),
  }
}

function normalizeExercise(
  exercise: RoutineExerciseWriteRow["exercise"]
) {
  if (!exercise) return null
  if (Array.isArray(exercise)) return exercise[0] ?? null
  return exercise
}

function normalizeMachine(
  machine:
    | { name: string | null }
    | { name: string | null }[]
    | null
) {
  if (!machine) return null
  if (Array.isArray(machine)) return machine[0] ?? null
  return machine
}

export async function fetchAthleteOwnedRoutineForWrite(
  supabase: SupabaseServerClient,
  routineId: string,
  userId: string
) {
  const { data, error } = await supabase
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
        rest_seconds,
        weight_target,
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
    .eq("created_by", userId)
    .eq("is_template", false)
    .eq("is_active", true)
    .maybeSingle()

  return {
    data: (data as RoutineWriteRow | null) ?? null,
    error,
  }
}

export async function validateRoutineExerciseIds(
  supabase: SupabaseServerClient,
  exerciseIds: string[]
) {
  const uniqueExerciseIds = [...new Set(exerciseIds)]

  const { data, error } = await supabase
    .from("exercises")
    .select("id")
    .in("id", uniqueExerciseIds)

  if (error) {
    return {
      ok: false,
      missingIds: [] as string[],
      error,
    }
  }

  const existingIds = new Set((data ?? []).map((exercise) => exercise.id))
  const missingIds = uniqueExerciseIds.filter((id) => !existingIds.has(id))

  return {
    ok: missingIds.length === 0,
    missingIds,
    error: null,
  }
}
