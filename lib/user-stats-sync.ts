import { createAdminClient } from "@/lib/supabase/server"

interface CompletedWorkoutSessionAggregateRow {
  started_at: string | null
  ended_at: string | null
  total_volume_kg: number | null
  total_sets: number | null
  total_reps: number | null
}

const APP_TIME_ZONE = "America/Guayaquil"

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

function shiftDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function buildStreakSnapshot(sessionDateKeys: string[], referenceDateKey: string): {
  currentStreak: number
  longestStreak: number
} {
  const distinctDateKeys = Array.from(new Set(sessionDateKeys)).sort()
  if (distinctDateKeys.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
    }
  }

  let longestStreak = 0
  let currentRun = 0
  let previousDateKey: string | null = null

  for (const dateKey of distinctDateKeys) {
    if (previousDateKey && dateKey === shiftDateKey(previousDateKey, 1)) {
      currentRun += 1
    } else {
      currentRun = 1
    }

    longestStreak = Math.max(longestStreak, currentRun)
    previousDateKey = dateKey
  }

  const mostRecentDateKey = distinctDateKeys[distinctDateKeys.length - 1]
  const yesterdayDateKey = shiftDateKey(referenceDateKey, -1)

  if (mostRecentDateKey !== referenceDateKey && mostRecentDateKey !== yesterdayDateKey) {
    return {
      currentStreak: 0,
      longestStreak,
    }
  }

  let currentStreak = 1
  let expectedDateKey = shiftDateKey(mostRecentDateKey, -1)

  for (let index = distinctDateKeys.length - 2; index >= 0; index -= 1) {
    if (distinctDateKeys[index] !== expectedDateKey) {
      break
    }

    currentStreak += 1
    expectedDateKey = shiftDateKey(expectedDateKey, -1)
  }

  return {
    currentStreak,
    longestStreak,
  }
}

export async function syncUserStatsForProfile(params: {
  profileId: string
  syncTimestampIso?: string
}): Promise<void> {
  const { profileId, syncTimestampIso } = params
  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from("workout_sessions")
    .select("started_at, ended_at, total_volume_kg, total_sets, total_reps")
    .eq("profile_id", profileId)
    .eq("status", "completed")

  if (error) {
    throw error
  }

  const completedSessions = (data ?? []) as CompletedWorkoutSessionAggregateRow[]
  const sessionDateKeys = completedSessions
    .map((session) => formatDateKeyInTimeZone(session.ended_at ?? session.started_at ?? "", APP_TIME_ZONE))
    .filter((value): value is string => Boolean(value))

  const referenceDateKey = formatDateKeyInTimeZone(syncTimestampIso ?? new Date().toISOString(), APP_TIME_ZONE)
  const streakSnapshot = referenceDateKey
    ? buildStreakSnapshot(sessionDateKeys, referenceDateKey)
    : { currentStreak: 0, longestStreak: 0 }

  let lastWorkoutAt: string | null = null
  let totalVolumeKg = 0
  let totalSets = 0
  let totalReps = 0

  for (const session of completedSessions) {
    totalVolumeKg += toNonNegativeNumber(session.total_volume_kg)
    totalSets += toNonNegativeNumber(session.total_sets)
    totalReps += toNonNegativeNumber(session.total_reps)

    const sessionTimestamp = session.ended_at ?? session.started_at
    if (!sessionTimestamp) {
      continue
    }

    if (!lastWorkoutAt || new Date(sessionTimestamp).getTime() > new Date(lastWorkoutAt).getTime()) {
      lastWorkoutAt = sessionTimestamp
    }
  }

  const { error: upsertError } = await adminClient.from("user_stats").upsert(
    {
      profile_id: profileId,
      total_sessions: completedSessions.length,
      total_volume_kg: roundToDecimals(totalVolumeKg, 2),
      total_sets: totalSets,
      total_reps: totalReps,
      current_streak: streakSnapshot.currentStreak,
      longest_streak: streakSnapshot.longestStreak,
      last_workout_at: lastWorkoutAt,
      updated_at: syncTimestampIso ?? new Date().toISOString(),
    },
    {
      onConflict: "profile_id",
    }
  )

  if (upsertError) {
    throw upsertError
  }
}
