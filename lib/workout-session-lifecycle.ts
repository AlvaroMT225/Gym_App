import { createClient } from "@/lib/supabase/server"

export type WorkoutSessionSourceFlow = "qr" | "manual"

interface WorkoutSessionRow {
  id: string
  started_at: string
  ended_at: string | null
  total_volume_kg: number | null
  total_sets: number | null
  total_reps: number | null
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

export async function appendInteractionToWorkoutSession(params: {
  supabase: SupabaseClient
  athleteId: string
  gymId: string
  machineId: string
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

  const { data: existingRow, error: existingError } = await supabase
    .from("workout_sessions")
    .select("id, started_at, ended_at, total_volume_kg, total_sets, total_reps")
    .eq("profile_id", athleteId)
    .eq("status", "completed")
    .is("routine_id", null)
    .eq("source_flow", sourceFlow)
    .eq("competitive", competitive)
    .gte("updated_at", mergeWindowStartIso)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

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
      ended_at: eventAt,
      duration_minutes: calculateDurationMinutes(existing.started_at, eventAt),
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
        started_at: eventAt,
        ended_at: eventAt,
        duration_minutes: 1,
        total_volume_kg: totalVolumeKg,
        total_sets: totalSets,
        total_reps: totalReps,
        session_type: "gym",
        status: "completed",
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
