import { createClient } from "@/lib/supabase/server"

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export interface WorkoutContextInput {
  routineId: string | null
  exerciseId: string | null
  exerciseName: string | null
}

export interface SessionMetadataNotes {
  note: string | null
  routineId: string | null
  exerciseId: string | null
  exerciseName: string | null
}

interface ExerciseRow {
  id: string
  name: string
  machine_id: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function readStringField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = readString(record[key])
    if (value) return value
  }

  return null
}

export function parseWorkoutContextInput(value: unknown): WorkoutContextInput {
  if (!isRecord(value)) {
    return {
      routineId: null,
      exerciseId: null,
      exerciseName: null,
    }
  }

  return {
    routineId: readStringField(value, ["routine_id", "routineId"]),
    exerciseId: readStringField(value, ["exercise_id", "exerciseId"]),
    exerciseName: readStringField(value, ["exercise_name", "exerciseName"]),
  }
}

export function serializeSessionMetadataNotes(
  note: string | undefined,
  context: WorkoutContextInput
) {
  const trimmedNote = typeof note === "string" && note.trim().length > 0 ? note.trim() : null
  const hasContext = Boolean(context.routineId || context.exerciseId || context.exerciseName)

  if (!hasContext) {
    return trimmedNote
  }

  return JSON.stringify({
    v: 1,
    note: trimmedNote,
    routineId: context.routineId,
    exerciseId: context.exerciseId,
    exerciseName: context.exerciseName,
  })
}

export function parseSessionMetadataNotes(value: unknown): SessionMetadataNotes {
  if (typeof value !== "string" || value.trim().length === 0) {
    return {
      note: null,
      routineId: null,
      exerciseId: null,
      exerciseName: null,
    }
  }

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>
    if (!isRecord(parsed)) {
      throw new Error("invalid_session_metadata")
    }

    return {
      note: readString(parsed.note),
      routineId: readString(parsed.routineId),
      exerciseId: readString(parsed.exerciseId),
      exerciseName: readString(parsed.exerciseName),
    }
  } catch {
    return {
      note: value,
      routineId: null,
      exerciseId: null,
      exerciseName: null,
    }
  }
}

async function resolveExerciseById(
  supabase: SupabaseClient,
  machineId: string,
  exerciseId: string
) {
  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, machine_id")
    .eq("id", exerciseId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error("El ejercicio indicado no existe.")
  }

  const exercise = data as ExerciseRow
  if (exercise.machine_id !== machineId) {
    throw new Error("El ejercicio indicado no corresponde a la máquina seleccionada.")
  }

  return exercise
}

async function resolveExerciseByName(
  supabase: SupabaseClient,
  machineId: string,
  exerciseName: string
) {
  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, machine_id")
    .eq("name", exerciseName)
    .eq("machine_id", machineId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error("El ejercicio indicado no existe para la máquina seleccionada.")
  }

  return data as ExerciseRow
}

export async function resolveWorkoutContext(params: {
  supabase: SupabaseClient
  athleteId: string
  machineId: string
  input: WorkoutContextInput
}) {
  const { supabase, athleteId, machineId, input } = params

  if (input.routineId) {
    const { data: routine, error: routineError } = await supabase
      .from("routines")
      .select("id")
      .eq("id", input.routineId)
      .eq("profile_id", athleteId)
      .maybeSingle()

    if (routineError) {
      throw routineError
    }

    if (!routine) {
      throw new Error("La rutina indicada no pertenece al atleta autenticado.")
    }
  }

  let exerciseId: string | null = null
  let exerciseName: string | null = null

  if (input.exerciseId) {
    const exercise = await resolveExerciseById(supabase, machineId, input.exerciseId)
    exerciseId = exercise.id
    exerciseName = exercise.name
  } else if (input.exerciseName) {
    const exercise = await resolveExerciseByName(supabase, machineId, input.exerciseName)
    exerciseId = exercise.id
    exerciseName = exercise.name
  }

  if (input.routineId && exerciseId) {
    const { data: routineExercise, error: routineExerciseError } = await supabase
      .from("routine_exercises")
      .select("id")
      .eq("routine_id", input.routineId)
      .eq("exercise_id", exerciseId)
      .maybeSingle()

    if (routineExerciseError) {
      throw routineExerciseError
    }

    if (!routineExercise) {
      throw new Error("El ejercicio indicado no pertenece a la rutina seleccionada.")
    }
  }

  return {
    routineId: input.routineId,
    exerciseId,
    exerciseName,
  } satisfies WorkoutContextInput
}
