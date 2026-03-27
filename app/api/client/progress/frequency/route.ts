import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

type Period = "week" | "month" | "year" | "all"

function parsePeriod(value: string | null): Period {
  if (value === "week" || value === "month" || value === "year") return value
  return "all"
}

function getPeriodStart(period: Period): string | null {
  const now = Date.now()
  if (period === "week") return new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString()
  if (period === "month") return new Date(now - 29 * 24 * 60 * 60 * 1000).toISOString()
  if (period === "year") return new Date(now - 364 * 24 * 60 * 60 * 1000).toISOString()
  return null
}

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10)
}

interface FreqPoint {
  label: string
  date: string
  count: number
}

function buildWeekSeries(sessions: { started_at: string }[]): FreqPoint[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const countByDate = new Map<string, number>()
  for (const s of sessions) {
    const d = s.started_at.slice(0, 10)
    countByDate.set(d, (countByDate.get(d) ?? 0) + 1)
  }
  const series: FreqPoint[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = toDateStr(d)
    series.push({ label: DAY_LABELS[d.getDay()], date: dateStr, count: countByDate.get(dateStr) ?? 0 })
  }
  return series
}

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0=Sun, 1=Mon...
  const diff = (day + 6) % 7 // days since Monday
  d.setDate(d.getDate() - diff)
  return d
}

function getIsoWeekKey(date: Date): string {
  const monday = getMondayOf(date)
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`
}

function buildMonthSeries(sessions: { started_at: string }[]): FreqPoint[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Generate the 5 most recent week slots (Monday-anchored)
  const weekSlots: { key: string; label: string; date: string }[] = []
  const seenKeys = new Set<string>()
  for (let i = 0; i < 35; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = getIsoWeekKey(d)
    if (!seenKeys.has(key)) {
      seenKeys.add(key)
      weekSlots.unshift({ key, label: "", date: key })
      if (weekSlots.length === 5) break
    }
  }
  // Assign labels S1..S5 in chronological order
  weekSlots.forEach((slot, idx) => { slot.label = `S${idx + 1}` })

  // Map sessions to week keys
  const countByWeek = new Map<string, number>()
  for (const s of sessions) {
    const key = getIsoWeekKey(new Date(s.started_at))
    countByWeek.set(key, (countByWeek.get(key) ?? 0) + 1)
  }

  return weekSlots.map((slot) => ({ label: slot.label, date: slot.date, count: countByWeek.get(slot.key) ?? 0 }))
}

function buildYearSeries(sessions: { started_at: string }[]): FreqPoint[] {
  const today = new Date()
  const countByMonth = new Map<string, number>()
  for (const s of sessions) {
    const key = s.started_at.slice(0, 7)
    countByMonth.set(key, (countByMonth.get(key) ?? 0) + 1)
  }
  const series: FreqPoint[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    series.push({ label: MONTH_LABELS[d.getMonth()], date: key + "-01", count: countByMonth.get(key) ?? 0 })
  }
  return series
}

function buildAllSeries(sessions: { started_at: string }[]): FreqPoint[] {
  if (sessions.length === 0) return []
  const countByMonth = new Map<string, number>()
  for (const s of sessions) {
    const key = s.started_at.slice(0, 7)
    countByMonth.set(key, (countByMonth.get(key) ?? 0) + 1)
  }
  return [...countByMonth.keys()]
    .sort()
    .map((key) => {
      const monthIndex = parseInt(key.slice(5, 7), 10) - 1
      const year = key.slice(2, 4)
      return { label: `${MONTH_LABELS[monthIndex]} ${year}`, date: key + "-01", count: countByMonth.get(key) ?? 0 }
    })
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient(request)
    const userId = sessionOrResponse.userId
    const period = parsePeriod(request.nextUrl.searchParams.get("period"))
    const periodStart = getPeriodStart(period)

    let query = supabase
      .from("workout_sessions")
      .select("started_at")
      .eq("profile_id", userId)
      .eq("status", "completed")
      .order("started_at", { ascending: true })
    if (periodStart) query = query.gte("started_at", periodStart)

    const { data, error } = await query

    if (error) {
      console.error("GET /api/client/progress/frequency query error:", error)
      return NextResponse.json({ error: "Error al obtener frecuencia" }, { status: 500 })
    }

    const sessions = (data ?? []) as { started_at: string }[]
    let freqData: FreqPoint[]
    if (period === "week") freqData = buildWeekSeries(sessions)
    else if (period === "month") freqData = buildMonthSeries(sessions)
    else if (period === "year") freqData = buildYearSeries(sessions)
    else freqData = buildAllSeries(sessions)

    return NextResponse.json({ period, data: freqData })
  } catch (error) {
    console.error("GET /api/client/progress/frequency unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
