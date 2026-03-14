import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

interface UserStatsRow {
  current_streak: number | null
  total_points: number | null
}

interface AthleteXpTotalsRow {
  total_xp: number | null
  xp_by_region: unknown
}

interface XpByRegion {
  upper: number
  lower: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function toNonNegativeNumber(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0
  }

  return value >= 0 ? value : 0
}

function formatXpTotal(value: number): string {
  return `${new Intl.NumberFormat("en-US").format(value)} XP`
}

function readNumberField(
  row: unknown,
  field: keyof UserStatsRow | keyof AthleteXpTotalsRow
): number {
  if (!isRecord(row)) {
    return 0
  }

  const value = row[field]
  return typeof value === "number" ? toNonNegativeNumber(value) : 0
}

function toRegionNumber(value: unknown): number {
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

function readXpByRegion(row: unknown): XpByRegion {
  if (!isRecord(row)) {
    return { upper: 0, lower: 0 }
  }

  const rawRegion = row["xp_by_region"]
  if (!isRecord(rawRegion)) {
    return { upper: 0, lower: 0 }
  }

  return {
    upper: toRegionNumber(rawRegion["upper"]),
    lower: toRegionNumber(rawRegion["lower"]),
  }
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const userId = sessionOrResponse.userId

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, gym_id")
      .eq("id", userId)
      .single()

    if (profileError || !profile?.id) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })
    }

    const { data: statsData, error: statsError } = await supabase
      .from("user_stats")
      .select("current_streak, total_points")
      .eq("profile_id", userId)
      .maybeSingle()

    if (statsError) {
      console.error("GET /api/client/progress user_stats query error:", statsError)
      return NextResponse.json({ error: "Error al obtener progreso" }, { status: 500 })
    }

    const { data: xpData, error: xpError } = await supabase
      .from("athlete_xp_totals")
      .select("total_xp, xp_by_region")
      .eq("athlete_id", userId)
      .maybeSingle()

    if (xpError) {
      console.error("GET /api/client/progress athlete_xp_totals query error:", xpError)
      return NextResponse.json({ error: "Error al obtener progreso" }, { status: 500 })
    }

    const currentStreak = readNumberField(statsData, "current_streak")
    const totalPoints = readNumberField(statsData, "total_points")
    const xpTotal = readNumberField(xpData, "total_xp")
    const xpByRegion = readXpByRegion(xpData)

    return NextResponse.json({
      currentStreak,
      totalPoints,
      xp_total: xpTotal,
      xp_total_formatted: formatXpTotal(xpTotal),
      xp_by_region: xpByRegion,
    })
  } catch (error) {
    console.error("GET /api/client/progress unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
