import { createClient } from "@/lib/supabase/server"
import { parseSessionMetadataNotes } from "@/lib/workout-flow-context"

export type WorkoutSessionSourceFlow = "qr" | "manual"

interface WorkoutSessionRow {
  id: string
  started_at: string | null
  ended_at: string | null
  total_volume_kg: number | null
  total_sets: number | null
  total_reps: number | null
  duration_minutes?: number | null
  status?: string | null
}

interface GuidedWorkoutSessionRow {
  id: string
  routine_id: string | null
  started_at: string | null
  ended_at: string | null
  duration_minutes: number | null
  status: string | null
  updated_at?: string | null
}

interface RoutineExerciseRow {
  id: string
  exercise_id: string
  exercise: { id: string; name: string | null } | { id: string; name: string | null }[] | null
}

interface WorkoutInteractionRow {
  created_at: string
  notes: string | null
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

const WORKOUT_SESSION_MERGE_WINDOW_MS = 2 * 60 * 60 * 1000

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

function calculateDurationMinutes(startedAt: string, endedAt: string): number {
  const startedMs = new Date(startedAt).getTime()
  const endedMs = new Date(endedAt).getTime()

  if (!Number.isFinite(startedMs) || !Number.isFinite(endedMs) || endedMs <= startedMs) {
    return 1
  }

  return Math.max(1, Math.round((endedMs - startedMs) / 60000))
}

function normalizeOne<T>(value: T | T[] | null): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function normalizeText(value: string | null) {
  return typeof value === "string"
    ? value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLocaleLowerCase()
    : ""
}

export async function appendInteractionToWorkoutSession(params: {
  supabase: SupabaseClient
  athleteId: string
  gymId: string
  machineId: string
  workoutSessionId?: string | null
  routineId?: string | null
  sourceFlow: WorkoutSessionSourceFlow
  competitive: boolean
  totalVolumeKg: number
  totalSets: number
  totalReps: number
  occurredAt?: string
}) {
  const {
    supabase,
    athleteId,
    gymId,
    machineId,
    workoutSessionId: existingWorkoutSessionId,
    routineId,
    sourceFlow,
    competitive,
    totalVolumeKg,
    totalSets,
    totalReps,
    occurredAt,
  } = params

  const eventAt = occurredAt ?? new Date().toISOString()
  const mergeWindowStartIso = new Date(
    new Date(eventAt).getTime() - WORKOUT_SESSION_MERGE_WINDOW_MS
  ).toISOString()
  const isGuidedQrSession =
    sourceFlow === "qr" &&
    competitive === true &&
    typeof routineId === "string" &&
    routineId.length > 0

  if (existingWorkoutSessionId) {
    const { data: existingRow, error: existingError } = await supabase
      .from("workout_sessions")
      .select("id, started_at, ended_at, duration_minutes, total_volume_kg, total_sets, total_reps, status")
      .eq("id", existingWorkoutSessionId)
      .maybeSingle()

    if (existingError) {
      throw existingError
    }

    const existing = (existingRow ?? null) as WorkoutSessionRow | null

    if (!existing) {
      throw new Error("No se pudo resolver la sesión canónica de la rutina guiada.")
    }

    const nextTotals = {
      total_volume_kg: toNonNegativeNumber(existing.total_volume_kg) + totalVolumeKg,
      total_sets: toNonNegativeNumber(existing.total_sets) + totalSets,
      total_reps: toNonNegativeNumber(existing.total_reps) + totalReps,
      ...(isGuidedQrSession
        ? {}
        : {
            ended_at: eventAt,
            duration_minutes: calculateDurationMinutes(existing.started_at ?? eventAt, eventAt),
          }),
    }

    const { data: updatedRow, error: updateError } = await supabase
      .from("workout_sessions")
      .update(nextTotals)
      .eq("id", existingWorkoutSessionId)
      .select("id")
      .single()

    if (updateError || !updatedRow) {
      throw updateError ?? new Error("No se pudo actualizar la sesión canónica de entrenamiento.")
    }

    const { error: machineLinkError } = await supabase.from("session_machines").insert({
      session_id: existingWorkoutSessionId,
      machine_id: machineId,
      accessed_at: eventAt,
    })

    if (machineLinkError) {
      throw machineLinkError
    }

    return { workoutSessionId: updatedRow.id }
  }

  const existingQuery = supabase
    .from("workout_sessions")
    .select("id, started_at, ended_at, duration_minutes, total_volume_kg, total_sets, total_reps, status")
    .eq("profile_id", athleteId)
    .eq("source_flow", sourceFlow)
    .eq("competitive", competitive)
    .order("updated_at", { ascending: false })
    .limit(1)

  let existingResult:
    | Awaited<ReturnType<typeof existingQuery.maybeSingle>>
    | null = null

  if (isGuidedQrSession) {
    existingResult = await existingQuery.eq("status", "active").eq("routine_id", routineId).maybeSingle()
  } else if (typeof routineId === "string" && routineId.length > 0) {
    existingResult = await existingQuery
      .eq("status", "completed")
      .gte("updated_at", mergeWindowStartIso)
      .eq("routine_id", routineId)
      .maybeSingle()
  } else {
    existingResult = await existingQuery
      .eq("status", "completed")
      .gte("updated_at", mergeWindowStartIso)
      .is("routine_id", null)
      .maybeSingle()
  }

  const { data: existingRow, error: existingError } = existingResult

  if (existingError) {
    throw existingError
  }

  const existing = (existingRow ?? null) as WorkoutSessionRow | null

  let workoutSessionId: string

  if (existing) {
    const nextTotals = {
      total_volume_kg: toNonNegativeNumber(existing.total_volume_kg) + totalVolumeKg,
      total_sets: toNonNegativeNumber(existing.total_sets) + totalSets,
      total_reps: toNonNegativeNumber(existing.total_reps) + totalReps,
      ...(isGuidedQrSession
        ? {}
        : {
            ended_at: eventAt,
            duration_minutes: calculateDurationMinutes(existing.started_at ?? eventAt, eventAt),
          }),
    }

    const { data: updatedRow, error: updateError } = await supabase
      .from("workout_sessions")
      .update(nextTotals)
      .eq("id", existing.id)
      .select("id")
      .single()

    if (updateError || !updatedRow) {
      throw updateError ?? new Error("No se pudo actualizar la sesion de entrenamiento.")
    }

    workoutSessionId = updatedRow.id
  } else {
    const { data: insertedRow, error: insertError } = await supabase
      .from("workout_sessions")
      .insert({
        profile_id: athleteId,
        gym_id: gymId,
        routine_id: routineId ?? null,
        started_at: eventAt,
        ended_at: isGuidedQrSession ? null : eventAt,
        duration_minutes: isGuidedQrSession ? null : 1,
        total_volume_kg: totalVolumeKg,
        total_sets: totalSets,
        total_reps: totalReps,
        session_type: "gym",
        status: isGuidedQrSession ? "active" : "completed",
        source_flow: sourceFlow,
        competitive,
      })
      .select("id")
      .single()

    if (insertError || !insertedRow) {
      throw insertError ?? new Error("No se pudo crear la sesion de entrenamiento.")
    }

    workoutSessionId = insertedRow.id
  }

  const { error: machineLinkError } = await supabase.from("session_machines").insert({
    session_id: workoutSessionId,
    machine_id: machineId,
    accessed_at: eventAt,
  })

  if (machineLinkError) {
    throw machineLinkError
  }

  return { workoutSessionId }
}

export async function ensureGuidedQrWorkoutSession(params: {
  supabase: SupabaseClient
  athleteId: string
  gymId: string
  routineId: string
  startedAt?: string
  startMode?: "resume_or_create" | "explicit_start"
}) {
  const { supabase, athleteId, gymId, routineId, startedAt, startMode = "resume_or_create" } = params
  const canonicalStartedAt = startedAt ?? new Date().toISOString()

  const { data: existingRow, error: existingError } = await supabase
    .from("workout_sessions")
    .select("id, started_at, updated_at")
    .eq("profile_id", athleteId)
    .eq("routine_id", routineId)
    .eq("source_flow", "qr")
    .eq("competitive", true)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingError) {
    throw existingError
  }

  if (existingRow?.id) {
    if (startMode === "explicit_start") {
      const { error: cancelError } = await supabase
        .from("workout_sessions")
        .update({
          status: "cancelled",
          ended_at: canonicalStartedAt,
          duration_minutes: existingRow.started_at
            ? calculateDurationMinutes(existingRow.started_at, canonicalStartedAt)
            : null,
        })
        .eq("id", existingRow.id)

      if (cancelError) {
        throw cancelError
      }
    } else {
      return {
        workoutSessionId: existingRow.id,
        startedAt: existingRow.started_at ?? canonicalStartedAt,
        created: false,
      }
    }
  }

  const { data: insertedRow, error: insertError } = await supabase
    .from("workout_sessions")
    .insert({
      profile_id: athleteId,
      gym_id: gymId,
      routine_id: routineId,
      started_at: canonicalStartedAt,
      ended_at: null,
      duration_minutes: null,
      total_volume_kg: 0,
      total_sets: 0,
      total_reps: 0,
      session_type: "gym",
      status: "active",
      source_flow: "qr",
      competitive: true,
    })
    .select("id, started_at")
    .single()

  if (insertError || !insertedRow) {
    throw insertError ?? new Error("No se pudo iniciar la rutina guiada.")
  }

  return {
    workoutSessionId: insertedRow.id,
    startedAt: insertedRow.started_at ?? canonicalStartedAt,
    created: true,
  }
}

export async function finalizeGuidedQrWorkoutSessionIfComplete(params: {
  supabase: SupabaseClient
  workoutSessionId: string
  completedAt?: string
}) {
  const { supabase, workoutSessionId, completedAt } = params

  const { data: sessionRow, error: sessionError } = await supabase
    .from("workout_sessions")
    .select("id, routine_id, started_at, ended_at, duration_minutes, status")
    .eq("id", workoutSessionId)
    .eq("source_flow", "qr")
    .eq("competitive", true)
    .maybeSingle()

  if (sessionError) {
    throw sessionError
  }

  const session = (sessionRow ?? null) as GuidedWorkoutSessionRow | null
  if (!session || !session.routine_id) {
    return {
      finalized: false,
      workoutSessionId,
      routineId: session?.routine_id ?? null,
    }
  }

  const { data: routineExerciseRows, error: routineExerciseError } = await supabase
    .from("routine_exercises")
    .select(`
      id,
      exercise_id,
      exercise:exercises(
        id,
        name
      )
    `)
    .eq("routine_id", session.routine_id)

  if (routineExerciseError) {
    throw routineExerciseError
  }

  const routineSlots = ((routineExerciseRows ?? []) as RoutineExerciseRow[]).map((row) => ({
    id: row.id,
    exerciseId: row.exercise_id,
    exerciseName: normalizeOne(row.exercise)?.name ?? null,
  }))

  if (routineSlots.length === 0) {
    return {
      finalized: false,
      workoutSessionId,
      routineId: session.routine_id,
    }
  }

  const { data: qrRows, error: qrError } = await supabase
    .from("qr_sessions")
    .select("created_at, notes")
    .eq("workout_session_id", workoutSessionId)
    .order("created_at", { ascending: true })

  if (qrError) {
    throw qrError
  }

  const interactions = ((qrRows ?? []) as WorkoutInteractionRow[])
    .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime())
    .map((row) => parseSessionMetadataNotes(row.notes))

  const consumedSlotIds = new Set<string>()
  for (const interaction of interactions) {
    const slot = interaction.exerciseId
      ? routineSlots.find(
          (candidate) =>
            candidate.exerciseId === interaction.exerciseId && !consumedSlotIds.has(candidate.id)
        ) ?? null
      : routineSlots.find(
          (candidate) =>
            normalizeText(candidate.exerciseName) === normalizeText(interaction.exerciseName) &&
            !consumedSlotIds.has(candidate.id)
        ) ?? null

    if (slot) {
      consumedSlotIds.add(slot.id)
    }
  }

  if (consumedSlotIds.size < routineSlots.length) {
    return {
      finalized: false,
      workoutSessionId,
      routineId: session.routine_id,
    }
  }

  const endedAt = completedAt ?? new Date().toISOString()
  const durationMinutes = calculateDurationMinutes(session.started_at ?? endedAt, endedAt)

  if (
    session.status === "completed" &&
    session.ended_at === endedAt &&
    session.duration_minutes === durationMinutes
  ) {
    return {
      finalized: true,
      workoutSessionId,
      routineId: session.routine_id,
    }
  }

  const { error: finalizeError } = await supabase
    .from("workout_sessions")
    .update({
      status: "completed",
      ended_at: endedAt,
      duration_minutes: durationMinutes,
    })
    .eq("id", workoutSessionId)

  if (finalizeError) {
    throw finalizeError
  }

  return {
    finalized: true,
    workoutSessionId,
    routineId: session.routine_id,
  }
}
