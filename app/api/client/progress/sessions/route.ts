import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { fetchCombinedWorkoutSessionSummaries } from "@/lib/manual-training-sessions"

type AllowedDays = 7 | 30 | 90

const allowedDays = new Set<AllowedDays>([7, 30, 90])

function parseDays(daysParam: string | null): AllowedDays {
  const value = Number(daysParam)
  if (allowedDays.has(value as AllowedDays)) {
    return value as AllowedDays
  }
  return 30
}

interface WorkoutSessionSummary {
  id: string
  routine_id: string | null
  started_at: string
  date: string
  ended_at: string | null
  duration_minutes: number | null
  total_volume_kg: number
  total_sets: number
  total_reps: number
  status: string
  session_type: string
  routine_name: string
  classification: "rutina" | "libre"
  is_free_session: boolean
  exercise_count: number
  source: "qr" | "manual"
  competitive: boolean
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient(request)
    const userId = sessionOrResponse.userId
    const days = parseDays(request.nextUrl.searchParams.get("days"))
    const startIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    let sessions: WorkoutSessionSummary[]
    try {
      sessions = await fetchCombinedWorkoutSessionSummaries({
        supabase,
        athleteId: userId,
        startIso,
      })
    } catch (sessionsError) {
      console.error("GET /api/client/progress/sessions query error:", sessionsError)
      return NextResponse.json({ error: "Error al obtener sesiones" }, { status: 500 })
    }

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error("GET /api/client/progress/sessions unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
