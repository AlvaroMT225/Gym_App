import { createClient } from "@/lib/supabase/server"

export type WeightUnit = "kg" | "lb"
export type SessionSource = "qr" | "manual"

export interface NormalizedTrainingSet {
  weight: number
  reps: number
  entered_weight: number
  entered_weight_unit: WeightUnit
  weight_kg: number
}

export interface PersistedHistorySet extends NormalizedTrainingSet {
  display_weight: number
  display_unit: WeightUnit
  has_original_input: boolean
}

export interface ManualSessionBody {
  machine_id: string
  sets_data: NormalizedTrainingSet[]
  notes?: string
}

export interface LegacyManualSessionBody extends ManualSessionBody {
  source?: string
}

export interface CombinedWorkoutSessionSummary {
  id: string
  routine_id: string | null
  started_at: string
  ended_at: string | null
  duration_minutes: number | null
  total_volume_kg: number
  total_sets: number
  total_reps: number
  status: string
  session_type: string
  source: SessionSource
  competitive: boolean
}

interface WorkoutSessionRow {
  id: string
  routine_id: string | null
  started_at: string
  ended_at: string | null
  duration_minutes: number | null
  total_volume_kg: number | null
  total_sets: number | null
  total_reps: number | null
  status: string | null
  session_type: string | null
  notes: string | null
}

interface ManualTrainingSessionRow {
  id: string
  created_at: string
  total_volume: number | null
  notes: string | null
  sets_data: unknown
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

const LB_TO_KG = 0.45359237
const KG_DECIMALS = 4

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
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

function roundToDecimals(value: number, decimals: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function toWeightUnit(value: unknown): WeightUnit | null {
  if (value === "kg" || value === "lb") {
    return value
  }

  return null
}

function normalizeWeightToKg(weight: number, unit: WeightUnit): number {
  const normalized = unit === "lb" ? weight * LB_TO_KG : weight
  return roundToDecimals(normalized, KG_DECIMALS)
}

export function parseNormalizedTrainingSets(value: unknown): NormalizedTrainingSet[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null
  }

  const sets: NormalizedTrainingSet[] = []

  for (const item of value) {
    if (!isRecord(item)) {
      return null
    }

    const enteredWeight = toNonNegativeNumber(item.weight)
    const reps = toNonNegativeNumber(item.reps)
    const unit = toWeightUnit(item.weight_unit) ?? "kg"
    const weightKg = normalizeWeightToKg(enteredWeight, unit)

    if (enteredWeight <= 0 || reps <= 0 || weightKg <= 0) {
      return null
    }

    sets.push({
      weight: weightKg,
      reps,
      entered_weight: roundToDecimals(enteredWeight, KG_DECIMALS),
      entered_weight_unit: unit,
      weight_kg: weightKg,
    })
  }

  return sets
}

export function parseManualSessionBody(value: unknown): ManualSessionBody | null {
  if (!isRecord(value)) {
    return null
  }

  const machineId = typeof value.machine_id === "string" ? value.machine_id : ""
  const setsData = parseNormalizedTrainingSets(value.sets_data)
  const notes = typeof value.notes === "string" ? value.notes : undefined

  if (machineId.length === 0 || !setsData) {
    return null
  }

  return {
    machine_id: machineId,
    sets_data: setsData,
    notes,
  }
}

export function parseLegacyManualSessionBody(value: unknown): LegacyManualSessionBody | null {
  if (!isRecord(value)) {
    return null
  }

  const machineId = typeof value.machineId === "string" ? value.machineId : ""
  const setsData = parseNormalizedTrainingSets(value.sets)
  const notes = typeof value.notes === "string" ? value.notes : undefined
  const source = typeof value.source === "string" ? value.source : undefined

  if (machineId.length === 0 || !setsData) {
    return null
  }

  return {
    machine_id: machineId,
    sets_data: setsData,
    notes,
    source,
  }
}

export function calculateTrainingTotals(sets: NormalizedTrainingSet[]) {
  return {
    totalVolume: roundToDecimals(
      sets.reduce((sum, set) => sum + set.weight_kg * set.reps, 0),
      2
    ),
    totalSets: sets.length,
    totalReps: sets.reduce((sum, set) => sum + set.reps, 0),
  }
}

export function parsePersistedTrainingSets(value: unknown): PersistedHistorySet[] {
  if (!Array.isArray(value)) {
    return []
  }

  const sets: PersistedHistorySet[] = []

  for (const item of value) {
    if (!isRecord(item)) {
      continue
    }

    const reps = toNonNegativeNumber(item.reps)
    const canonicalWeightKg = toNonNegativeNumber(item.weight_kg) || toNonNegativeNumber(item.weight)
    if (reps <= 0 || canonicalWeightKg <= 0) {
      continue
    }

    const originalUnit = toWeightUnit(item.entered_weight_unit)
    const originalWeight = toNonNegativeNumber(item.entered_weight)
    const hasOriginalInput = originalUnit !== null && originalWeight > 0
    const displayUnit: WeightUnit = hasOriginalInput ? originalUnit : "kg"
    const displayWeight = hasOriginalInput ? originalWeight : canonicalWeightKg

    sets.push({
      reps,
      weight: canonicalWeightKg,
      weight_kg: canonicalWeightKg,
      entered_weight: displayWeight,
      entered_weight_unit: displayUnit,
      display_weight: displayWeight,
      display_unit: displayUnit,
      has_original_input: hasOriginalInput,
    })
  }

  return sets
}

export async function insertManualTrainingSession(params: {
  supabase: SupabaseClient
  athleteId: string
  gymId: string
  machineId: string
  setsData: NormalizedTrainingSet[]
  notes?: string
}) {
  const { supabase, athleteId, gymId, machineId, setsData, notes } = params

  const { data: machine, error: machineError } = await supabase
    .from("machines")
    .select("id")
    .eq("id", machineId)
    .eq("gym_id", gymId)
    .maybeSingle()

  if (machineError) {
    throw new Error("No se pudo verificar la máquina.")
  }

  if (!machine) {
    throw new Error("La máquina no existe en tu gimnasio.")
  }

  const totals = calculateTrainingTotals(setsData)
  const { data, error } = await supabase
    .from("manual_training_sessions")
    .insert({
      athlete_id: athleteId,
      gym_id: gymId,
      machine_id: machineId,
      sets_data: setsData,
      total_volume: totals.totalVolume,
      notes: notes?.trim() || null,
      is_competitive: false,
    })
    .select("id, created_at, total_volume")
    .single()

  if (error || !data) {
    throw new Error("No se pudo guardar la sesión manual.")
  }

  return {
    id: data.id,
    created_at: data.created_at,
    total_volume: toNonNegativeNumber(data.total_volume),
    ...totals,
  }
}

function mapWorkoutSessionSummary(row: WorkoutSessionRow): CombinedWorkoutSessionSummary {
  const source: SessionSource = row.notes === "qr" ? "qr" : "manual"

  return {
    id: row.id,
    routine_id: row.routine_id,
    started_at: row.started_at,
    ended_at: row.ended_at,
    duration_minutes: row.duration_minutes,
    total_volume_kg: toNonNegativeNumber(row.total_volume_kg),
    total_sets: toNonNegativeNumber(row.total_sets),
    total_reps: toNonNegativeNumber(row.total_reps),
    status: row.status ?? "completed",
    session_type: row.session_type ?? "gym",
    source,
    competitive: source === "qr",
  }
}

function mapManualSessionSummary(row: ManualTrainingSessionRow): CombinedWorkoutSessionSummary {
  const totals = calculateTrainingTotals(parsePersistedTrainingSets(row.sets_data))

  return {
    id: row.id,
    routine_id: null,
    started_at: row.created_at,
    ended_at: null,
    duration_minutes: null,
    total_volume_kg: toNonNegativeNumber(row.total_volume) || totals.totalVolume,
    total_sets: totals.totalSets,
    total_reps: totals.totalReps,
    status: "completed",
    session_type: "manual",
    source: "manual",
    competitive: false,
  }
}

export async function fetchCombinedWorkoutSessionSummaries(params: {
  supabase: SupabaseClient
  athleteId: string
  startIso?: string
  limit?: number
}) {
  const { supabase, athleteId, startIso, limit } = params

  let workoutQuery = supabase
    .from("workout_sessions")
    .select("id, routine_id, started_at, ended_at, duration_minutes, total_volume_kg, total_sets, total_reps, status, session_type, notes")
    .eq("profile_id", athleteId)
    .order("started_at", { ascending: false })

  let manualQuery = supabase
    .from("manual_training_sessions")
    .select("id, created_at, total_volume, notes, sets_data")
    .eq("athlete_id", athleteId)
    .order("created_at", { ascending: false })

  if (startIso) {
    workoutQuery = workoutQuery.gte("started_at", startIso)
    manualQuery = manualQuery.gte("created_at", startIso)
  }

  if (limit) {
    workoutQuery = workoutQuery.limit(limit)
    manualQuery = manualQuery.limit(limit)
  }

  const [
    { data: workoutRows, error: workoutError },
    { data: manualRows, error: manualError },
  ] = await Promise.all([workoutQuery, manualQuery])

  if (workoutError) {
    throw workoutError
  }

  if (manualError) {
    throw manualError
  }

  return [
    ...((workoutRows ?? []) as WorkoutSessionRow[]).map(mapWorkoutSessionSummary),
    ...((manualRows ?? []) as ManualTrainingSessionRow[]).map(mapManualSessionSummary),
  ]
    .sort((left, right) => new Date(right.started_at).getTime() - new Date(left.started_at).getTime())
    .slice(0, limit ?? Number.MAX_SAFE_INTEGER)
}
