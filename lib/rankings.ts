const APP_TIME_ZONE = "America/Guayaquil"

export const LEADERBOARD_LIMIT = 20

export type GenderFilter = "male" | "female" | "other"
export type AgeRangeFilter = "18-30" | "31-45" | "46-60" | "60+"
export type RankingRegionFilter = "upper" | "lower"

export interface LeaderboardProfileRow {
  id: string
  gym_id: string | null
  nickname?: unknown
  birth_date: string | null
  gender: string | null
}

function getCurrentDateKeyInTimeZone(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function readDateParts(dateKey: string): [number, number, number] | null {
  const [year, month, day] = dateKey.split("-").map((part) => Number.parseInt(part, 10))
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null
  }

  return [year, month, day]
}

export function parseGenderFilter(value: string | null): GenderFilter | null {
  if (!value) {
    return null
  }

  if (value === "male" || value === "female" || value === "other") {
    return value
  }

  throw new Error("Parametro gender invalido. Usa male, female o other.")
}

export function parseAgeRangeFilter(value: string | null): AgeRangeFilter | null {
  if (!value) {
    return null
  }

  if (value === "18-30" || value === "31-45" || value === "46-60" || value === "60+") {
    return value
  }

  throw new Error("Parametro age_range invalido. Usa 18-30, 31-45, 46-60 o 60+.")
}

export function parseRegionFilter(value: string | null): RankingRegionFilter {
  if (value === "upper" || value === "lower") {
    return value
  }

  throw new Error("Parametro region invalido. Usa upper o lower.")
}

export function normalizeNickname(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim()
  }

  return "Atleta"
}

export function normalizeRank(value: unknown): number | null {
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

export function normalizeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return 0
}

export function calculateTendency(previousRank: unknown, rankPosition: unknown): number {
  const normalizedRank = normalizeRank(rankPosition)
  const normalizedPreviousRank = normalizeRank(previousRank) ?? normalizedRank

  if (!normalizedRank || !normalizedPreviousRank) {
    return 0
  }

  return normalizedPreviousRank - normalizedRank
}

export function calculateAge(birthDate: string | null, currentDateKey?: string): number | null {
  if (!birthDate || birthDate.trim().length < 10) {
    return null
  }

  const birthDateKey = birthDate.trim().slice(0, 10)
  const birthParts = readDateParts(birthDateKey)
  if (!birthParts) {
    return null
  }

  const nowKey = currentDateKey ?? getCurrentDateKeyInTimeZone(APP_TIME_ZONE)
  const currentParts = readDateParts(nowKey)
  if (!currentParts) {
    return null
  }

  const [birthYear, birthMonth, birthDay] = birthParts
  const [currentYear, currentMonth, currentDay] = currentParts

  let age = currentYear - birthYear
  if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
    age -= 1
  }

  return age >= 0 ? age : null
}

export function matchesGenderFilter(profile: LeaderboardProfileRow | null, gender: GenderFilter | null): boolean {
  if (!gender) {
    return true
  }

  return profile?.gender === gender
}

export function matchesAgeRangeFilter(
  profile: LeaderboardProfileRow | null,
  ageRange: AgeRangeFilter | null,
  currentDateKey?: string
): boolean {
  if (!ageRange) {
    return true
  }

  const age = calculateAge(profile?.birth_date ?? null, currentDateKey)
  if (age === null) {
    return false
  }

  if (ageRange === "18-30") {
    return age >= 18 && age <= 30
  }

  if (ageRange === "31-45") {
    return age >= 31 && age <= 45
  }

  if (ageRange === "46-60") {
    return age >= 46 && age <= 60
  }

  return age >= 60
}

