import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

/* ---------- constants ---------- */

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

/* ---------- helpers ---------- */

interface AthleteRef {
  id: string
  first_name: string | null
  last_name: string | null
}

function normalizeAthlete(raw: unknown): AthleteRef | null {
  if (!raw) return null
  if (Array.isArray(raw)) return (raw[0] as AthleteRef) ?? null
  return raw as AthleteRef
}

function athleteName(a: AthleteRef): string {
  return `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || a.id
}

function athleteAvatar(a: AthleteRef): string {
  const f = (a.first_name ?? "?")[0]?.toUpperCase() ?? "?"
  const l = (a.last_name ?? "?")[0]?.toUpperCase() ?? "?"
  return `${f}${l}`
}

function isUUID(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
}

/* ---------- GET ---------- */

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const coachId = sessionOrResponse.userId

  try {
    const supabase = await createClient()

    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const nowDate = now.toISOString().split("T")[0]
    const weekEndDate = weekEnd.toISOString().split("T")[0]
    const nowIso = now.toISOString()
    const weekEndIso = weekEnd.toISOString()

    // Parallel: planned sessions + calendar events for next 7 days
    const [{ data: sessionsData, error: sessionsError }, { data: eventsData, error: eventsError }] =
      await Promise.all([
        supabase
          .from("planned_sessions")
          .select(
            "id, title, scheduled_at, content, athlete:profiles!athlete_id(id, first_name, last_name)"
          )
          .eq("coach_id", coachId)
          .not("scheduled_at", "is", null)
          .gte("scheduled_at", nowIso)
          .lt("scheduled_at", weekEndIso)
          .order("scheduled_at", { ascending: true }),

        supabase
          .from("coach_calendar_events")
          .select(
            "id, title, event_date, start_time, event_type, athlete:profiles!athlete_id(id, first_name, last_name)"
          )
          .eq("coach_id", coachId)
          .gte("event_date", nowDate)
          .lt("event_date", weekEndDate)
          .order("event_date", { ascending: true }),
      ])

    if (sessionsError) {
      console.error("GET /api/trainer/calendar sessions error:", sessionsError)
      return NextResponse.json({ error: "Error al obtener calendario" }, { status: 500 })
    }

    if (eventsError) {
      // Non-fatal — calendar events supplement the view
      console.error("GET /api/trainer/calendar events error:", eventsError)
    }

    // Collect unique real exercise UUIDs from session content to batch-resolve names
    type ContentItem = { exerciseId?: string; exerciseName?: string }

    const exerciseUUIDs = new Set<string>()
    for (const s of sessionsData ?? []) {
      const items = Array.isArray(s.content) ? (s.content as ContentItem[]) : []
      for (const item of items) {
        if (item.exerciseId && isUUID(item.exerciseId)) {
          exerciseUUIDs.add(item.exerciseId)
        }
      }
    }

    // Batch resolve exercise names in one query
    const exerciseNameMap = new Map<string, string>()
    if (exerciseUUIDs.size > 0) {
      const { data: exData } = await supabase
        .from("exercises")
        .select("id, name")
        .in("id", Array.from(exerciseUUIDs))
      for (const ex of exData ?? []) {
        exerciseNameMap.set(ex.id, ex.name)
      }
    }

    // Build merged CalendarSession list
    type CalendarSession = {
      id: string
      title: string
      clientName: string
      clientAvatar: string
      clientId: string
      scheduledAt: string
      exerciseCount: number
      exercises: string[]
    }

    const allEntries: CalendarSession[] = []

    for (const s of sessionsData ?? []) {
      const athlete = normalizeAthlete(s.athlete)
      const items = Array.isArray(s.content) ? (s.content as ContentItem[]) : []
      const exercises = items.map(
        (item) =>
          item.exerciseName ??
          (item.exerciseId
            ? exerciseNameMap.get(item.exerciseId) ?? item.exerciseId
            : "Ejercicio")
      )
      allEntries.push({
        id: s.id,
        title: s.title,
        clientName: athlete ? athleteName(athlete) : "Cliente",
        clientAvatar: athlete ? athleteAvatar(athlete) : "??",
        clientId: athlete ? athlete.id : "",
        scheduledAt: s.scheduled_at as string,
        exerciseCount: items.length,
        exercises,
      })
    }

    for (const ev of eventsData ?? []) {
      const athlete = normalizeAthlete(ev.athlete)
      const scheduledAt = ev.start_time
        ? `${ev.event_date}T${ev.start_time}`
        : `${ev.event_date}T00:00:00`
      allEntries.push({
        id: ev.id,
        title: ev.title,
        clientName: athlete ? athleteName(athlete) : "General",
        clientAvatar: athlete ? athleteAvatar(athlete) : "GE",
        clientId: athlete ? athlete.id : "",
        scheduledAt,
        exerciseCount: 0,
        exercises: [],
      })
    }

    // Build 7-day calendar structure
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split("T")[0]
      const dayLabel = DAY_NAMES[date.getDay()]
      const sessions = allEntries
        .filter((e) => e.scheduledAt.startsWith(dateStr))
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
      return { date: dateStr, dayLabel, sessions }
    })

    return NextResponse.json({ days })
  } catch (err) {
    console.error("GET /api/trainer/calendar unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
