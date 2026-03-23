import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import {
  parsePersistedTrainingSets,
  type PersistedHistorySet,
  type SessionSource,
  type WeightUnit,
} from "@/lib/manual-training-sessions"
import { parseSessionMetadataNotes } from "@/lib/workout-flow-context"

interface MachineHistoryBestSeries {
  reps: number
  weightKg: number
  displayWeight: number
  displayUnit: WeightUnit
  volume: number
}

interface MachineHistoryEntry {
  id: string
  created_at: string
  notes: string | null
  exerciseId: string | null
  exerciseName: string | null
  bestSeries: MachineHistoryBestSeries | null
  total_volume: number
  session_xp: number
  factor_progreso: number
  source: SessionSource
  competitive: boolean
  has_original_weight_input: boolean
  sets: PersistedHistorySet[]
}

interface MachineHistoryRowBase {
  id: string
  created_at: string
  notes: string | null
  total_volume: number | null
  sets_data: unknown
  workout_session_id: string | null
}

interface QrHistoryRow extends MachineHistoryRowBase {
  session_xp: number | null
  factor_progreso: number | null
}

interface ManualHistoryRow extends MachineHistoryRowBase {}

interface ExerciseLookupRow {
  id: string
  name: string
  machine_id: string | null
}

interface WorkoutSetExerciseRow {
  session_id: string
  exercise: ExerciseLookupRow | ExerciseLookupRow[] | null
}

interface RoutineExerciseLookupRow {
  routine_id: string
  exercise: ExerciseLookupRow | ExerciseLookupRow[] | null
}

interface WorkoutSessionLookupRow {
  id: string
  routine_id: string | null
}

function toNonNegativeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value >= 0 ? value : 0
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return parsed >= 0 ? parsed : 0
    }
  }

  return 0
}

function roundToDecimals(value: number, decimals: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function normalizeExerciseLookup(
  exercise: ExerciseLookupRow | ExerciseLookupRow[] | null
): ExerciseLookupRow | null {
  if (!exercise) return null
  if (Array.isArray(exercise)) return exercise[0] ?? null
  return exercise
}

function collectExerciseMapEntry(
  map: Map<string, Map<string, string>>,
  key: string,
  exercise: ExerciseLookupRow | null,
  machineId: string
) {
  if (!exercise || exercise.machine_id !== machineId) {
    return
  }

  const existing = map.get(key)
  if (existing) {
    existing.set(exercise.id, exercise.name)
    return
  }

  map.set(key, new Map([[exercise.id, exercise.name]]))
}

function resolveSingleExercise(
  entries: Map<string, string> | undefined
): { exerciseId: string; exerciseName: string } | null {
  if (!entries || entries.size !== 1) {
    return null
  }

  const [exerciseId, exerciseName] = Array.from(entries.entries())[0]
  return { exerciseId, exerciseName }
}

function getBestSeries(sets: PersistedHistorySet[]): MachineHistoryBestSeries | null {
  if (sets.length === 0) {
    return null
  }

  const best = [...sets].sort((left, right) => {
    const leftVolume = left.weight_kg * left.reps
    const rightVolume = right.weight_kg * right.reps

    if (rightVolume !== leftVolume) {
      return rightVolume - leftVolume
    }

    if (right.weight_kg !== left.weight_kg) {
      return right.weight_kg - left.weight_kg
    }

    return right.reps - left.reps
  })[0]

  return {
    reps: best.reps,
    weightKg: best.weight_kg,
    displayWeight: best.display_weight,
    displayUnit: best.display_unit,
    volume: roundToDecimals(best.weight_kg * best.reps, 2),
  }
}

async function resolveExerciseContextByWorkoutSession(params: {
  supabase: Awaited<ReturnType<typeof createClient>>
  machineId: string
  workoutSessionIds: string[]
}) {
  const { supabase, machineId, workoutSessionIds } = params
  const exerciseContextByWorkoutSessionId = new Map<
    string,
    { exerciseId: string; exerciseName: string }
  >()

  if (workoutSessionIds.length === 0) {
    return exerciseContextByWorkoutSessionId
  }

  const uniqueWorkoutSessionIds = Array.from(new Set(workoutSessionIds))

  const { data: workoutSessionRows, error: workoutSessionError } = await supabase
    .from("workout_sessions")
    .select("id, routine_id")
    .in("id", uniqueWorkoutSessionIds)

  if (workoutSessionError) {
    throw workoutSessionError
  }

  const workoutSessions = (workoutSessionRows ?? []) as WorkoutSessionLookupRow[]
  const routineIdByWorkoutSessionId = new Map(
    workoutSessions
      .filter((row) => typeof row.routine_id === "string" && row.routine_id.length > 0)
      .map((row) => [row.id, row.routine_id as string])
  )

  const { data: workoutSetRows, error: workoutSetError } = await supabase
    .from("workout_sets")
    .select(`
      session_id,
      exercise:exercises(
        id,
        name,
        machine_id
      )
    `)
    .in("session_id", uniqueWorkoutSessionIds)

  if (workoutSetError) {
    throw workoutSetError
  }

  const exerciseNamesByWorkoutSessionId = new Map<string, Map<string, string>>()
  for (const row of (workoutSetRows ?? []) as WorkoutSetExerciseRow[]) {
    collectExerciseMapEntry(
      exerciseNamesByWorkoutSessionId,
      row.session_id,
      normalizeExerciseLookup(row.exercise),
      machineId
    )
  }

  const routineIds = Array.from(new Set(routineIdByWorkoutSessionId.values()))
  const exerciseNamesByRoutineId = new Map<string, Map<string, string>>()

  if (routineIds.length > 0) {
    const { data: routineExerciseRows, error: routineExerciseError } = await supabase
      .from("routine_exercises")
      .select(`
        routine_id,
        exercise:exercises(
          id,
          name,
          machine_id
        )
      `)
      .in("routine_id", routineIds)

    if (routineExerciseError) {
      throw routineExerciseError
    }

    for (const row of (routineExerciseRows ?? []) as RoutineExerciseLookupRow[]) {
      collectExerciseMapEntry(
        exerciseNamesByRoutineId,
        row.routine_id,
        normalizeExerciseLookup(row.exercise),
        machineId
      )
    }
  }

  for (const workoutSessionId of uniqueWorkoutSessionIds) {
    const workoutSetExercise = resolveSingleExercise(
      exerciseNamesByWorkoutSessionId.get(workoutSessionId)
    )

    if (workoutSetExercise) {
      exerciseContextByWorkoutSessionId.set(workoutSessionId, workoutSetExercise)
      continue
    }

    const routineId = routineIdByWorkoutSessionId.get(workoutSessionId)
    if (!routineId) {
      continue
    }

    const routineExercise = resolveSingleExercise(exerciseNamesByRoutineId.get(routineId))
    if (routineExercise) {
      exerciseContextByWorkoutSessionId.set(workoutSessionId, routineExercise)
    }
  }

  return exerciseContextByWorkoutSessionId
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ machineId: string }> }
) {
  const { machineId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient(request)
    const userId = sessionOrResponse.userId

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", userId)
      .maybeSingle()

    if (profileError) {
      console.error("GET /api/machines/[machineId] profile error:", profileError)
      return NextResponse.json({ error: "Error al obtener maquina" }, { status: 500 })
    }

    if (!profile?.gym_id) {
      return NextResponse.json({ machine: null, history: [] satisfies MachineHistoryEntry[] })
    }

    const { data: machine, error: machineError } = await supabase
      .from("machines")
      .select("id, gym_id, name, description, muscle_groups, equipment_type, status, location, image_url, instructions, settings")
      .eq("id", machineId)
      .eq("gym_id", profile.gym_id)
      .maybeSingle()

    if (machineError) {
      console.error("GET /api/machines/[machineId] query error:", machineError)
      return NextResponse.json({ error: "Error al obtener maquina" }, { status: 500 })
    }

    if (!machine) {
      return NextResponse.json({ machine: null, history: [] satisfies MachineHistoryEntry[] })
    }

    const [
      { data: qrHistoryRows, error: qrHistoryError },
      { data: manualHistoryRows, error: manualHistoryError },
    ] = await Promise.all([
      supabase
        .from("qr_sessions")
        .select("id, created_at, notes, total_volume, session_xp, factor_progreso, sets_data, workout_session_id")
        .eq("athlete_id", userId)
        .eq("machine_id", machineId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("manual_training_sessions")
        .select("id, created_at, notes, total_volume, sets_data, workout_session_id")
        .eq("athlete_id", userId)
        .eq("machine_id", machineId)
        .order("created_at", { ascending: false })
        .limit(10),
    ])

    if (qrHistoryError) {
      console.error("GET /api/machines/[machineId] qr history error:", qrHistoryError)
    }

    if (manualHistoryError) {
      console.error("GET /api/machines/[machineId] manual history error:", manualHistoryError)
    }

    const workoutSessionIds = [
      ...((qrHistoryRows ?? []) as QrHistoryRow[]).map((row) => row.workout_session_id),
      ...((manualHistoryRows ?? []) as ManualHistoryRow[]).map((row) => row.workout_session_id),
    ].filter((value): value is string => typeof value === "string" && value.length > 0)

    const exerciseContextByWorkoutSessionId = await resolveExerciseContextByWorkoutSession({
      supabase,
      machineId,
      workoutSessionIds,
    })

    const qrHistory: MachineHistoryEntry[] = Array.isArray(qrHistoryRows)
      ? (qrHistoryRows as QrHistoryRow[]).map((row) => {
          const sets = parsePersistedTrainingSets(row.sets_data)
          const noteContext = parseSessionMetadataNotes(row.notes)
          const linkedExercise =
            row.workout_session_id
              ? exerciseContextByWorkoutSessionId.get(row.workout_session_id) ?? null
              : null
          return {
            id: row.id,
            created_at: row.created_at,
            notes: noteContext.note,
            exerciseId: noteContext.exerciseId ?? linkedExercise?.exerciseId ?? null,
            exerciseName: noteContext.exerciseName ?? linkedExercise?.exerciseName ?? null,
            bestSeries: getBestSeries(sets),
            total_volume: toNonNegativeNumber(row.total_volume),
            session_xp: toNonNegativeNumber(row.session_xp),
            factor_progreso: toNonNegativeNumber(row.factor_progreso),
            source: "qr",
            competitive: true,
            has_original_weight_input: sets.some((set) => set.has_original_input),
            sets,
          }
        })
      : []

    const manualHistory: MachineHistoryEntry[] = Array.isArray(manualHistoryRows)
      ? (manualHistoryRows as ManualHistoryRow[]).map((row) => {
          const sets = parsePersistedTrainingSets(row.sets_data)
          const noteContext = parseSessionMetadataNotes(row.notes)
          const linkedExercise =
            row.workout_session_id
              ? exerciseContextByWorkoutSessionId.get(row.workout_session_id) ?? null
              : null
          return {
            id: row.id,
            created_at: row.created_at,
            notes: noteContext.note,
            exerciseId: noteContext.exerciseId ?? linkedExercise?.exerciseId ?? null,
            exerciseName: noteContext.exerciseName ?? linkedExercise?.exerciseName ?? null,
            bestSeries: getBestSeries(sets),
            total_volume: toNonNegativeNumber(row.total_volume),
            session_xp: 0,
            factor_progreso: 0,
            source: "manual",
            competitive: false,
            has_original_weight_input: sets.some((set) => set.has_original_input),
            sets,
          }
        })
      : []

    const history = [...qrHistory, ...manualHistory]
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
      .slice(0, 10)

    return NextResponse.json({ machine, history })
  } catch (error) {
    console.error("GET /api/machines/[machineId] unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
