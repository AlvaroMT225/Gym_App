import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

interface XpHistoryPoint {
  week: string
  xp: number
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

function toValidDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function startOfIsoWeek(date: Date): Date {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = utc.getUTCDay() || 7
  utc.setUTCDate(utc.getUTCDate() - day + 1)
  utc.setUTCHours(0, 0, 0, 0)
  return utc
}

function getIsoWeekKey(date: Date): string {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = utc.getUTCDay() || 7
  utc.setUTCDate(utc.getUTCDate() + 4 - day)

  const isoYear = utc.getUTCFullYear()
  const yearStart = new Date(Date.UTC(isoYear, 0, 1))
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  const weekStr = week.toString().padStart(2, "0")

  return `${isoYear}-W${weekStr}`
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const userId = sessionOrResponse.userId

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single()

    if (profileError || !profile?.id) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })
    }

    const currentWeekStart = startOfIsoWeek(new Date())
    const firstWeekStart = new Date(currentWeekStart)
    firstWeekStart.setUTCDate(firstWeekStart.getUTCDate() - 7 * 7)

    const { data, error } = await supabase
      .from("qr_sessions")
      .select("created_at, session_xp")
      .eq("athlete_id", userId)
      .gte("created_at", firstWeekStart.toISOString())
      .order("created_at", { ascending: true })

    if (error) {
      console.error("GET /api/client/progress/xp-history qr_sessions query error:", error)
      return NextResponse.json({ error: "Error al obtener historial de XP" }, { status: 500 })
    }

    const rows = Array.isArray(data) ? data : []
    if (rows.length === 0) {
      return NextResponse.json([] satisfies XpHistoryPoint[])
    }

    const weekSums = new Map<string, number>()
    for (let index = 0; index < 8; index += 1) {
      const weekDate = new Date(firstWeekStart)
      weekDate.setUTCDate(firstWeekStart.getUTCDate() + index * 7)
      weekSums.set(getIsoWeekKey(weekDate), 0)
    }

    for (const row of rows) {
      if (!isRecord(row)) {
        continue
      }

      const createdAt = toValidDate(row["created_at"])
      if (!createdAt) {
        continue
      }

      const weekKey = getIsoWeekKey(createdAt)
      if (!weekSums.has(weekKey)) {
        continue
      }

      const currentXp = weekSums.get(weekKey) ?? 0
      const nextXp = currentXp + toNonNegativeNumber(row["session_xp"])
      weekSums.set(weekKey, nextXp)
    }

    const history: XpHistoryPoint[] = Array.from(weekSums.entries()).map(([week, xp]) => ({
      week,
      xp: Number(xp.toFixed(2)),
    }))

    return NextResponse.json(history)
  } catch (error) {
    console.error("GET /api/client/progress/xp-history unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
