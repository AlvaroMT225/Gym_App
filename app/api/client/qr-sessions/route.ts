import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createAdminClient, createClient } from "@/lib/supabase/server"
import {
  appendInteractionToWorkoutSession,
  ensureGuidedQrWorkoutSession,
  finalizeGuidedQrWorkoutSessionIfComplete,
} from "@/lib/workout-session-lifecycle"
import {
  parseWorkoutContextInput,
  parseSessionMetadataNotes,
  resolveWorkoutContext,
  serializeSessionMetadataNotes,
  WORKOUT_CONTEXT_MACHINE_FALLBACK_AMBIGUOUS_ERROR,
  WORKOUT_CONTEXT_MACHINE_FALLBACK_NOT_FOUND_ERROR,
} from "@/lib/workout-flow-context"
import { syncUserStatsForProfile } from "@/lib/user-stats-sync"

type WeightUnit = "kg" | "lb"

interface NormalizedSetData {
  weight: number
  reps: number
  entered_weight: number
  entered_weight_unit: WeightUnit
  weight_kg: number
}

interface QrSessionRequestBody {
  machine_id: string
  sets_data: NormalizedSetData[]
  notes?: string
  routineId?: string | null
  exerciseId?: string | null
  exerciseName?: string | null
  session_duration_seconds?: number
}

interface AthleteXpTotalsRow {
  total_xp: number | null
  xp_by_region: unknown
  xp_by_group: unknown
  sessions_with_high_fp: number | null
  consecutive_weeks: number | null
}

interface AchievementCandidateRow {
  id: string
  name: string
  points: number | null
  xp_threshold: number | null
  achievement_category: string | null
}

interface UserAchievementIdRow {
  achievement_id: string
}

interface XpSnapshot {
  totalXp: number
  sessionsWithHighFp: number
  consecutiveWeeks: number
  upperXp: number
  lowerXp: number
}

interface CompetitiveWorkoutSessionDateRow {
  started_at: string | null
  ended_at: string | null
}

interface RecentQrSessionNoteRow {
  id: string
  created_at: string
  notes: string | null
  total_volume: number | null
}

interface FactorConstanciaResult {
  consecutiveActiveWeeks: number
  factorConstancia: number
}

interface ExerciseAttributionRow {
  muscle_groups: unknown
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>
type RankingRegion = "upper" | "lower"

const HIGH_FP_THRESHOLD = 1.2
const MIN_SESSION_SETS = 2
const LB_TO_KG = 0.45359237
const CANONICAL_KG_DECIMALS = 4
const APP_TIME_ZONE = "America/Guayaquil"
const ACTIVE_WEEK_MIN_COMPLETED_SESSIONS = 3
const FC2_WEEK_CAP = 4
const FC2_INCREMENT = 0.05
const FC2_LOOKBACK_WEEKS = 16
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000
const QR_EXERCISE_HISTORY_BATCH_SIZE = 50
const UPPER_BODY_MUSCLE_GROUPS = new Set(["chest", "back", "shoulders", "biceps", "triceps", "arms"])
const LOWER_BODY_MUSCLE_GROUPS = new Set(["legs", "glutes", "core"])
const QR_WORKOUT_CONTEXT_BAD_REQUEST_MESSAGES = new Set([
  WORKOUT_CONTEXT_MACHINE_FALLBACK_NOT_FOUND_ERROR,
  WORKOUT_CONTEXT_MACHINE_FALLBACK_AMBIGUOUS_ERROR,
  "El ejercicio indicado no existe.",
  "El ejercicio indicado no corresponde a la máquina seleccionada.",
  "El ejercicio indicado no existe para la máquina seleccionada.",
  "El ejercicio indicado no pertenece a la rutina seleccionada.",
  "La rutina indicada no pertenece al atleta autenticado.",
])

function toNullableRank(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.trunc(value)
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }

  return null
}

function toRankingRegion(value: string): RankingRegion | null {
  if (value === "upper" || value === "lower") {
    return value
  }
  return null
}

function toRegionLabel(region: RankingRegion | null): string | null {
  if (region === "upper") {
    return "Tren Superior"
  }
  if (region === "lower") {
    return "Tren Inferior"
  }
  return null
}

function readMuscleGroups(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
}

function deriveExerciseAttribution(muscleGroups: string[]): {
  region: RankingRegion | ""
  primaryMuscleGroup: string | null
} {
  for (const group of muscleGroups) {
    if (UPPER_BODY_MUSCLE_GROUPS.has(group)) {
      return {
        region: "upper",
        primaryMuscleGroup: group,
      }
    }

    if (LOWER_BODY_MUSCLE_GROUPS.has(group)) {
      return {
        region: "lower",
        primaryMuscleGroup: group,
      }
    }
  }

  return {
    region: "",
    primaryMuscleGroup: null,
  }
}

async function getRegionalRankPosition(
  adminClient: ReturnType<typeof createAdminClient>,
  athleteId: string,
  gymId: string,
  region: RankingRegion
): Promise<number | null> {
  const { data, error } = await adminClient
    .from("regional_rankings")
    .select("rank_position")
    .eq("athlete_id", athleteId)
    .eq("gym_id", gymId)
    .eq("region", region)
    .maybeSingle()

  if (error) {
    console.error("POST /api/client/qr-sessions regional rank query error:", error)
    return null
  }

  if (!data || !isRecord(data)) {
    return null
  }

  return toNullableRank(data.rank_position)
}

async function getGlobalRankPosition(
  adminClient: ReturnType<typeof createAdminClient>,
  athleteId: string,
  gymId: string
): Promise<number | null> {
  const { data, error } = await adminClient
    .from("global_rankings")
    .select("rank_position")
    .eq("athlete_id", athleteId)
    .eq("gym_id", gymId)
    .maybeSingle()

  if (error) {
    console.error("POST /api/client/qr-sessions global rank query error:", error)
    return null
  }

  if (!data || !isRecord(data)) {
    return null
  }

  return toNullableRank(data.rank_position)
}

function formatRpcError(error: { message?: string; details?: string | null; hint?: string | null }): string {
  const parts: string[] = []
  if (error.message) parts.push(error.message)
  if (error.details) parts.push(error.details)
  if (error.hint) parts.push(`hint: ${error.hint}`)
  return parts.join(" | ")
}

async function recalculateRankingsForGym(userClient: SupabaseClient, gymId: string): Promise<boolean> {
  const { error: userError } = await userClient.rpc("recalculate_rankings", {
    p_gym_id: gymId,
  })

  if (!userError) {
    return true
  }

  const adminClient = createAdminClient()
  const { error: adminWithGymError } = await adminClient.rpc("recalculate_rankings", {
    p_gym_id: gymId,
  })

  if (!adminWithGymError) {
    return true
  }

  const { error: adminWithoutArgError } = await adminClient.rpc("recalculate_rankings")
  if (!adminWithoutArgError) {
    return true
  }

  console.error(
    "RPC `recalculate_rankings` failed for all attempts:",
    formatRpcError(userError),
    formatRpcError(adminWithGymError),
    formatRpcError(adminWithoutArgError)
  )

  return false
}

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

function formatDateKeyInTimeZone(dateIso: string, timeZone: string): string | null {
  const date = new Date(dateIso)
  if (!Number.isFinite(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

function getMondayWeekKey(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00Z`)
  const day = date.getUTCDay()
  const diff = (day + 6) % 7
  date.setUTCDate(date.getUTCDate() - diff)
  return date.toISOString().slice(0, 10)
}

function subtractWeeks(weekKey: string, weeks: number): string {
  const date = new Date(`${weekKey}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - weeks * 7)
  return date.toISOString().slice(0, 10)
}

async function calculateStrictFactorConstancia(params: {
  supabase: SupabaseClient
  athleteId: string
  referenceDateIso: string
}): Promise<FactorConstanciaResult> {
  const { supabase, athleteId, referenceDateIso } = params
  const referenceDateKey = formatDateKeyInTimeZone(referenceDateIso, APP_TIME_ZONE)
  if (!referenceDateKey) {
    return {
      consecutiveActiveWeeks: 0,
      factorConstancia: 1,
    }
  }

  const currentWeekKey = getMondayWeekKey(referenceDateKey)
  const lookbackStartWeekKey = subtractWeeks(currentWeekKey, FC2_LOOKBACK_WEEKS - 1)

  const { data, error } = await supabase
    .from("workout_sessions")
    .select("started_at, ended_at")
    .eq("profile_id", athleteId)
    .eq("status", "completed")
    .eq("competitive", true)

  if (error) {
    throw error
  }

  const sessions = (data ?? []) as CompetitiveWorkoutSessionDateRow[]
  const countsByWeek = new Map<string, number>()

  for (const session of sessions) {
    const sessionDateIso = session.ended_at ?? session.started_at
    if (!sessionDateIso) {
      continue
    }

    const sessionDateKey = formatDateKeyInTimeZone(sessionDateIso, APP_TIME_ZONE)
    if (!sessionDateKey) {
      continue
    }

    if (sessionDateKey < lookbackStartWeekKey) {
      continue
    }

    const weekKey = getMondayWeekKey(sessionDateKey)
    countsByWeek.set(weekKey, (countsByWeek.get(weekKey) ?? 0) + 1)
  }

  let consecutiveActiveWeeks = 0
  for (let offset = 0; offset < FC2_LOOKBACK_WEEKS; offset += 1) {
    const weekKey = subtractWeeks(currentWeekKey, offset)
    if ((countsByWeek.get(weekKey) ?? 0) < ACTIVE_WEEK_MIN_COMPLETED_SESSIONS) {
      break
    }
    consecutiveActiveWeeks += 1
  }

  return {
    consecutiveActiveWeeks,
    factorConstancia: roundToDecimals(1 + Math.min(consecutiveActiveWeeks, FC2_WEEK_CAP) * FC2_INCREMENT, 2),
  }
}

function getResolvedExerciseIdFromNotes(notes: string | null): string | null {
  return parseSessionMetadataNotes(notes).exerciseId
}

async function getRecentQrSessionsForResolvedExercise(params: {
  supabase: SupabaseClient
  athleteId: string
  exerciseId: string
  limit: number
  machineId?: string
  createdAfterIso?: string
}): Promise<RecentQrSessionNoteRow[]> {
  const { supabase, athleteId, exerciseId, limit, machineId, createdAfterIso } = params
  const matches: RecentQrSessionNoteRow[] = []
  let from = 0

  while (matches.length < limit) {
    let query = supabase
      .from("qr_sessions")
      .select("id, created_at, notes, total_volume")
      .eq("athlete_id", athleteId)
      .order("created_at", { ascending: false })
      .range(from, from + QR_EXERCISE_HISTORY_BATCH_SIZE - 1)

    if (machineId) {
      query = query.eq("machine_id", machineId)
    }

    if (createdAfterIso) {
      query = query.gte("created_at", createdAfterIso)
    }

    const { data, error } = await query
    if (error) {
      throw error
    }

    const rows = (data ?? []) as RecentQrSessionNoteRow[]
    for (const row of rows) {
      if (getResolvedExerciseIdFromNotes(row.notes) === exerciseId) {
        matches.push(row)
        if (matches.length >= limit) {
          break
        }
      }
    }

    if (rows.length < QR_EXERCISE_HISTORY_BATCH_SIZE) {
      break
    }

    from += QR_EXERCISE_HISTORY_BATCH_SIZE
  }

  return matches
}

async function ensureNoDuplicateExerciseSession(params: {
  supabase: SupabaseClient
  athleteId: string
  exerciseId: string
  referenceDateIso: string
}): Promise<void> {
  const { supabase, athleteId, exerciseId, referenceDateIso } = params
  const recentWindowStartIso = new Date(new Date(referenceDateIso).getTime() - DUPLICATE_WINDOW_MS).toISOString()

  const recentMatches = await getRecentQrSessionsForResolvedExercise({
    supabase,
    athleteId,
    exerciseId,
    createdAfterIso: recentWindowStartIso,
    limit: 1,
  })

  if (recentMatches.length > 0) {
    throw new Error("Ya registraste este ejercicio hace menos de 5 minutos.")
  }
}

function toWeightUnit(value: unknown): WeightUnit | null {
  if (value === "kg" || value === "lb") {
    return value
  }

  return null
}

function normalizeWeightToKg(weight: number, unit: WeightUnit): number {
  const normalized = unit === "lb" ? weight * LB_TO_KG : weight
  return roundToDecimals(normalized, CANONICAL_KG_DECIMALS)
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

function parseSetsData(value: unknown): NormalizedSetData[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null
  }

  const sets: NormalizedSetData[] = []
  for (const item of value) {
    if (!isRecord(item)) {
      return null
    }

    const enteredWeight = toNonNegativeNumber(item.weight)
    const reps = toNonNegativeNumber(item.reps)
    const enteredWeightUnit = toWeightUnit(item.weight_unit) ?? "kg"
    const weightKg = normalizeWeightToKg(enteredWeight, enteredWeightUnit)

    if (enteredWeight <= 0 || reps <= 0 || weightKg <= 0) {
      return null
    }

    sets.push({
      weight: weightKg,
      reps,
      entered_weight: roundToDecimals(enteredWeight, CANONICAL_KG_DECIMALS),
      entered_weight_unit: enteredWeightUnit,
      weight_kg: weightKg,
    })
  }

  return sets
}

function parseRequestBody(value: unknown): QrSessionRequestBody | null {
  if (!isRecord(value)) {
    return null
  }

  const machineId = typeof value.machine_id === "string" ? value.machine_id : ""
  const setsData = parseSetsData(value.sets_data)
  const notes = typeof value.notes === "string" ? value.notes : undefined

  if (machineId.length === 0 || !setsData) {
    return null
  }

  const sessionDurationSeconds =
    typeof value.session_duration_seconds === "number" && value.session_duration_seconds > 0
      ? Math.floor(value.session_duration_seconds)
      : 0

  return {
    machine_id: machineId,
    sets_data: setsData,
    notes,
    session_duration_seconds: sessionDurationSeconds,
    ...parseWorkoutContextInput(value),
  }
}

function readNumberMap(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {}
  }

  const parsed: Record<string, number> = {}
  for (const [key, entry] of Object.entries(value)) {
    parsed[key] = toNonNegativeNumber(entry)
  }
  return parsed
}

function buildSnapshotFromTotals(row: AthleteXpTotalsRow): XpSnapshot {
  const region = readNumberMap(row.xp_by_region)
  return {
    totalXp: toNonNegativeNumber(row.total_xp),
    sessionsWithHighFp: toNonNegativeNumber(row.sessions_with_high_fp),
    consecutiveWeeks: toNonNegativeNumber(row.consecutive_weeks),
    upperXp: toNonNegativeNumber(region.upper),
    lowerXp: toNonNegativeNumber(region.lower),
  }
}

function shouldUnlockXpAchievement(achievement: AchievementCandidateRow, snapshot: XpSnapshot): boolean {
  const threshold = toNonNegativeNumber(achievement.xp_threshold)
  if (threshold > 0) {
    return snapshot.totalXp >= threshold
  }

  const name = normalizeName(achievement.name)
  if (name === "evolucion") {
    return snapshot.sessionsWithHighFp >= 10
  }

  if (name === "imparable") {
    return snapshot.consecutiveWeeks >= 12
  }

  if (name === "atleta completo") {
    return snapshot.upperXp >= 500 && snapshot.lowerXp >= 500
  }

  return false
}

async function unlockXpAchievements(
  supabase: SupabaseClient,
  profileId: string,
  snapshot: XpSnapshot
): Promise<void> {
  const { data: achievementsData, error: achievementsError } = await supabase
    .from("achievements")
    .select("id, name, points, xp_threshold, achievement_category")
    .eq("is_active", true)

  if (achievementsError) {
    console.error("POST /api/client/qr-sessions achievements query error:", achievementsError)
    return
  }

  const candidates = ((achievementsData ?? []) as AchievementCandidateRow[]).filter((achievement) =>
    shouldUnlockXpAchievement(achievement, snapshot)
  )
  if (candidates.length === 0) {
    return
  }

  const candidateIds = candidates.map((candidate) => candidate.id)
  const { data: existingData, error: existingError } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("profile_id", profileId)
    .in("achievement_id", candidateIds)

  if (existingError) {
    console.error("POST /api/client/qr-sessions user_achievements query error:", existingError)
    return
  }

  const existingIds = new Set(
    ((existingData ?? []) as UserAchievementIdRow[]).map((entry) => entry.achievement_id)
  )
  const toUnlock = candidates.filter((candidate) => !existingIds.has(candidate.id))
  if (toUnlock.length === 0) {
    return
  }

  const now = new Date().toISOString()
  const payloadWithXp = toUnlock.map((achievement) => ({
    profile_id: profileId,
    achievement_id: achievement.id,
    unlocked_at: now,
    xp_at_unlock: snapshot.totalXp,
  }))

  let insertedIds = new Set<string>()

  const { data: insertedWithXp, error: insertWithXpError } = await supabase
    .from("user_achievements")
    .insert(payloadWithXp)
    .select("achievement_id")

  if (insertWithXpError) {
    const payloadWithoutXp = toUnlock.map((achievement) => ({
      profile_id: profileId,
      achievement_id: achievement.id,
      unlocked_at: now,
    }))

    const { data: insertedWithoutXp, error: insertWithoutXpError } = await supabase
      .from("user_achievements")
      .insert(payloadWithoutXp)
      .select("achievement_id")

    if (insertWithoutXpError) {
      console.error("POST /api/client/qr-sessions user_achievements insert error:", insertWithoutXpError)
      return
    }

    insertedIds = new Set(
      ((insertedWithoutXp ?? []) as UserAchievementIdRow[]).map((entry) => entry.achievement_id)
    )
  } else {
    insertedIds = new Set(
      ((insertedWithXp ?? []) as UserAchievementIdRow[]).map((entry) => entry.achievement_id)
    )
  }

  if (insertedIds.size === 0) {
    return
  }

  for (const achievement of toUnlock) {
    if (!insertedIds.has(achievement.id)) {
      continue
    }

    const points = toNonNegativeNumber(achievement.points)
    if (points <= 0) {
      continue
    }

    const { error: addPointsError } = await supabase.rpc("add_points_to_user", {
      p_profile_id: profileId,
      p_points: points,
      p_reason: `Achievement unlocked: ${achievement.name}`,
      p_reference_id: achievement.id,
      p_reference_type: "achievement",
    })

    if (addPointsError) {
      console.error("POST /api/client/qr-sessions add_points_to_user error:", addPointsError)
    }
  }

  const insertedCount = insertedIds.size
  const { data: statsRow, error: statsError } = await supabase
    .from("user_stats")
    .select("achievements_count")
    .eq("profile_id", profileId)
    .maybeSingle()

  if (statsError) {
    console.error("POST /api/client/qr-sessions user_stats query error:", statsError)
    return
  }

  const nextCount = toNonNegativeNumber(statsRow?.achievements_count) + insertedCount
  if (statsRow) {
    const { error: updateStatsError } = await supabase
      .from("user_stats")
      .update({
        achievements_count: nextCount,
        updated_at: now,
      })
      .eq("profile_id", profileId)

    if (updateStatsError) {
      console.error("POST /api/client/qr-sessions user_stats update error:", updateStatsError)
    }
    return
  }

  const { error: insertStatsError } = await supabase
    .from("user_stats")
    .insert({
      profile_id: profileId,
      achievements_count: insertedCount,
      updated_at: now,
    })

  if (insertStatsError) {
    console.error("POST /api/client/qr-sessions user_stats insert error:", insertStatsError)
  }
}

export async function POST(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createClient(request)

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", sessionOrResponse.userId)
      .single()

    if (!profile || !profile.gym_id) {
      return NextResponse.json({ error: "User profile or gym not found" }, { status: 404 })
    }

    const athleteId = sessionOrResponse.userId
    const gymId = profile.gym_id

    const rawBody: unknown = await request.json()
    const body = parseRequestBody(rawBody)
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { machine_id, sets_data, notes } = body

    if (sets_data.length < MIN_SESSION_SETS) {
      return NextResponse.json(
        { error: "Debes registrar al menos 2 sets para finalizar la sesion." },
        { status: 400 }
      )
    }
    const MAX_SESSION_SETS = 4
    if (sets_data.length > MAX_SESSION_SETS) {
      return NextResponse.json(
        { error: "Máximo 4 series por sesión en la misma máquina." },
        { status: 400 }
      )
    }

    const totalVolume = sets_data.reduce((acc, set) => acc + set.weight_kg * set.reps, 0)
    const totalSets = sets_data.length
    const totalReps = sets_data.reduce((acc, set) => acc + set.reps, 0)

    const { data: machine, error: machineError } = await supabase
      .from("machines")
      .select("max_weight_limit")
      .eq("id", machine_id)
      .single()

    if (machineError || !machine) {
      return NextResponse.json({ error: "Machine not found" }, { status: 404 })
    }

    let workoutContext: Awaited<ReturnType<typeof resolveWorkoutContext>>
    try {
      workoutContext = await resolveWorkoutContext({
        supabase,
        athleteId,
        machineId: machine_id,
        input: {
          routineId: body.routineId ?? null,
          exerciseId: body.exerciseId ?? null,
          exerciseName: body.exerciseName ?? null,
        },
        allowMachineExerciseFallback: true,
      })
    } catch (error) {
      if (error instanceof Error && QR_WORKOUT_CONTEXT_BAD_REQUEST_MESSAGES.has(error.message)) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      throw error
    }

    if (!workoutContext.exerciseId) {
      return NextResponse.json(
        { error: "No se pudo resolver el ejercicio de la sesión QR." },
        { status: 400 }
      )
    }

    const requestTimestamp = new Date().toISOString()
    await ensureNoDuplicateExerciseSession({
      supabase,
      athleteId,
      exerciseId: workoutContext.exerciseId,
      referenceDateIso: requestTimestamp,
    })

    const { data: exerciseAttributionRow, error: exerciseAttributionError } = await supabase
      .from("exercises")
      .select("muscle_groups")
      .eq("id", workoutContext.exerciseId)
      .maybeSingle()

    if (exerciseAttributionError) {
      throw exerciseAttributionError
    }

    const exerciseAttribution = deriveExerciseAttribution(
      readMuscleGroups((exerciseAttributionRow as ExerciseAttributionRow | null)?.muscle_groups)
    )
    const region = exerciseAttribution.region
    const primaryMuscleGroup = exerciseAttribution.primaryMuscleGroup

    const recentSessions = await getRecentQrSessionsForResolvedExercise({
      supabase,
      athleteId,
      machineId: machine_id,
      exerciseId: workoutContext.exerciseId,
      limit: 4,
    })

    let factorProgreso = 1.0
    if (recentSessions && recentSessions.length === 4) {
      const avgVolume =
        recentSessions.reduce((acc, session) => acc + toNonNegativeNumber(session.total_volume), 0) /
        4

      if (avgVolume > 0) {
        const calculatedFp = totalVolume / avgVolume
        factorProgreso = Math.min(1.5, Math.max(0.85, calculatedFp))
      }
    }

    // Anti-fraud #3: peso irreal vs límite de la máquina
    let isFlagged = false
    let flagReason: string | null = null
    const maxWeightLimit = typeof machine.max_weight_limit === "number" ? machine.max_weight_limit : null
    if (maxWeightLimit && maxWeightLimit > 0) {
      const maxWeightUsed = Math.max(...sets_data.map((s) => s.weight_kg))
      if (maxWeightUsed > maxWeightLimit) {
        isFlagged = true
        flagReason = `Peso reportado (${maxWeightUsed} kg) supera el límite de la máquina (${maxWeightLimit} kg).`
      }
    }

    // Anti-fraud #5: salto de volumen > 3x promedio histórico
    if (recentSessions && recentSessions.length >= 3) {
      const avgHistorical =
        recentSessions.reduce((acc, s) => acc + toNonNegativeNumber(s.total_volume), 0) /
        recentSessions.length
      if (avgHistorical > 0 && totalVolume > avgHistorical * 3) {
        isFlagged = true
        flagReason = flagReason
          ? `${flagReason} | Volumen (${totalVolume.toFixed(0)} kg) supera 3x el promedio histórico (${avgHistorical.toFixed(0)} kg).`
          : `Volumen (${totalVolume.toFixed(0)} kg) supera 3x el promedio histórico (${avgHistorical.toFixed(0)} kg).`
      }
    }

    const guidedParentSession = workoutContext.routineId
      ? await ensureGuidedQrWorkoutSession({
          supabase,
          athleteId,
          gymId,
          routineId: workoutContext.routineId,
        })
      : null

    const { data: insertedQrSession, error: insertError } = await supabase
      .from("qr_sessions")
      .insert({
        athlete_id: athleteId,
        gym_id: gymId,
        machine_id,
        sets_data,
        notes: serializeSessionMetadataNotes(notes, workoutContext),
        total_volume: totalVolume,
        factor_progreso: factorProgreso,
        factor_constancia: 1,
        consecutive_active_weeks: 0,
        session_xp: 0,
        is_flagged: isFlagged,
        flag_reason: flagReason,
        session_duration_seconds: body.session_duration_seconds ?? 0,
        region,
        primary_muscle_group: primaryMuscleGroup,
        exercise_id: workoutContext.exerciseId ?? null,
        workout_session_id: guidedParentSession?.workoutSessionId ?? null,
      })
      .select("id, created_at")
      .single()

    if (insertError || !insertedQrSession) {
      throw insertError ?? new Error("No se pudo guardar la sesión QR.")
    }

    const parentSession = await appendInteractionToWorkoutSession({
      supabase,
      athleteId,
      gymId,
      machineId: machine_id,
      workoutSessionId: guidedParentSession?.workoutSessionId ?? null,
      routineId: workoutContext.routineId,
      sourceFlow: "qr",
      competitive: true,
      totalVolumeKg: totalVolume,
      totalSets,
      totalReps,
      occurredAt: insertedQrSession.created_at,
    })

    if (guidedParentSession && workoutContext.routineId) {
      await finalizeGuidedQrWorkoutSessionIfComplete({
        supabase,
        workoutSessionId: parentSession.workoutSessionId,
        completedAt: insertedQrSession.created_at,
      })
    }

    if (!guidedParentSession) {
      const { error: parentLinkError } = await supabase
        .from("qr_sessions")
        .update({ workout_session_id: parentSession.workoutSessionId })
        .eq("id", insertedQrSession.id)

      if (parentLinkError) {
        throw parentLinkError
      }
    }

    const { consecutiveActiveWeeks, factorConstancia } = await calculateStrictFactorConstancia({
      supabase,
      athleteId,
      referenceDateIso: insertedQrSession.created_at,
    })
    const sessionXp = roundToDecimals(
      totalVolume * factorProgreso * factorConstancia * 0.01,
      CANONICAL_KG_DECIMALS
    )

    const { error: updateQrSessionMetricsError } = await supabase
      .from("qr_sessions")
      .update({
        factor_constancia: factorConstancia,
        consecutive_active_weeks: consecutiveActiveWeeks,
        session_xp: sessionXp,
      })
      .eq("id", insertedQrSession.id)

    if (updateQrSessionMetricsError) {
      throw updateQrSessionMetricsError
    }

    const { data: currentXp, error: currentXpError } = await supabase
      .from("athlete_xp_totals")
      .select("total_xp, xp_by_region, xp_by_group, sessions_with_high_fp, consecutive_weeks")
      .eq("athlete_id", athleteId)
      .maybeSingle()

    let xpSnapshot: XpSnapshot = {
      totalXp: sessionXp,
      sessionsWithHighFp: factorProgreso >= HIGH_FP_THRESHOLD ? 1 : 0,
      consecutiveWeeks: consecutiveActiveWeeks,
      upperXp: 0,
      lowerXp: 0,
    }

    if (currentXpError) {
      console.error("POST /api/client/qr-sessions athlete_xp_totals query error:", currentXpError)
    }

    if (currentXp) {
      const currentRow = currentXp as AthleteXpTotalsRow
      const newTotalXp = toNonNegativeNumber(currentRow.total_xp) + sessionXp

      const newXpByRegion = readNumberMap(currentRow.xp_by_region)
      if (region === "upper" || region === "lower") {
        newXpByRegion[region] = toNonNegativeNumber(newXpByRegion[region]) + sessionXp
      }

      const newXpByGroup = readNumberMap(currentRow.xp_by_group)
      if (primaryMuscleGroup) {
        newXpByGroup[primaryMuscleGroup] =
          toNonNegativeNumber(newXpByGroup[primaryMuscleGroup]) + sessionXp
      }

      const sessionsWithHighFp =
        toNonNegativeNumber(currentRow.sessions_with_high_fp) +
        (factorProgreso >= HIGH_FP_THRESHOLD ? 1 : 0)

      const { error: updateXpError } = await supabase
        .from("athlete_xp_totals")
        .update({
          total_xp: newTotalXp,
          xp_by_region: newXpByRegion,
          xp_by_group: newXpByGroup,
          sessions_with_high_fp: sessionsWithHighFp,
          consecutive_weeks: consecutiveActiveWeeks,
          updated_at: new Date().toISOString(),
        })
        .eq("athlete_id", athleteId)

      if (updateXpError) {
        throw updateXpError
      }

      xpSnapshot = {
        ...buildSnapshotFromTotals(currentRow),
        totalXp: newTotalXp,
        sessionsWithHighFp: sessionsWithHighFp,
        consecutiveWeeks: consecutiveActiveWeeks,
        upperXp: toNonNegativeNumber(newXpByRegion.upper),
        lowerXp: toNonNegativeNumber(newXpByRegion.lower),
      }
    } else {
      const initialXpByRegion: Record<string, number> = {}
      if (region === "upper" || region === "lower") {
        initialXpByRegion[region] = sessionXp
      }

      const initialXpByGroup: Record<string, number> = {}
      if (primaryMuscleGroup) {
        initialXpByGroup[primaryMuscleGroup] = sessionXp
      }

      const sessionsWithHighFp = factorProgreso >= HIGH_FP_THRESHOLD ? 1 : 0
      const { error: insertXpError } = await supabase.from("athlete_xp_totals").insert({
        athlete_id: athleteId,
        gym_id: gymId,
        total_xp: sessionXp,
        xp_by_region: initialXpByRegion,
        xp_by_group: initialXpByGroup,
        sessions_with_high_fp: sessionsWithHighFp,
        consecutive_weeks: consecutiveActiveWeeks,
        updated_at: new Date().toISOString(),
      })

      if (insertXpError) {
        throw insertXpError
      }

      xpSnapshot = {
        totalXp: sessionXp,
        sessionsWithHighFp,
        consecutiveWeeks: consecutiveActiveWeeks,
        upperXp: toNonNegativeNumber(initialXpByRegion.upper),
        lowerXp: toNonNegativeNumber(initialXpByRegion.lower),
      }
    }

    const adminClient = createAdminClient()
    await syncUserStatsForProfile({
      profileId: athleteId,
      syncTimestampIso: insertedQrSession.created_at,
    })

    const rankingsRecalculated = await recalculateRankingsForGym(supabase, gymId)
    if (!rankingsRecalculated) {
      console.error("POST /api/client/qr-sessions: rankings were not recalculated for gym", gymId)
    }

    const rankingRegion = toRankingRegion(region)
    const regionLabel = toRegionLabel(rankingRegion)

    const [rankRegional, rankGlobal] = await Promise.all([
      rankingRegion ? getRegionalRankPosition(adminClient, athleteId, gymId, rankingRegion) : Promise.resolve(null),
      getGlobalRankPosition(adminClient, athleteId, gymId),
    ])

    const { error: legacyAchievementsError } = await supabase.rpc("check_achievements", {
      p_profile_id: athleteId,
    })
    if (legacyAchievementsError) {
      console.error("RPC `check_achievements` failed:", legacyAchievementsError)
    }

    await unlockXpAchievements(supabase, athleteId, xpSnapshot)

    return NextResponse.json({
      success: true,
      session_xp: sessionXp,
      factor_progreso: factorProgreso,
      factor_constancia: factorConstancia,
      consecutive_active_weeks: consecutiveActiveWeeks,
      total_volume: totalVolume,
      workout_session_id: parentSession.workoutSessionId,
      rankings_recalculated: rankingsRecalculated,
      rank_regional: rankRegional,
      rank_global: rankGlobal,
      region_label: regionLabel,
    })
  } catch (error: unknown) {
    console.error("Error in /api/client/qr-sessions:", error)
    const message = error instanceof Error ? error.message : "An unexpected error occurred"
    const status = message === "Ya registraste este ejercicio hace menos de 5 minutos." ? 409 : 500
    return NextResponse.json({ error: message }, { status })
  }
}



