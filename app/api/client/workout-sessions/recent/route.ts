import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { fetchCombinedWorkoutSessionSummaries } from "@/lib/manual-training-sessions"

interface WorkoutSessionSummary {
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
  source: "qr" | "manual"
  competitive: boolean
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const userId = sessionOrResponse.userId

    let sessions: WorkoutSessionSummary[]
    try {
      sessions = await fetchCombinedWorkoutSessionSummaries({
        supabase,
        athleteId: userId,
        limit: 10,
      })
    } catch (sessionsError) {
      console.error("GET /api/client/workout-sessions/recent query error:", sessionsError)
      return NextResponse.json({ error: "Error al obtener sesiones" }, { status: 500 })
    }

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error("GET /api/client/workout-sessions/recent unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
