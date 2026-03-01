import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

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
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const userId = sessionOrResponse.userId

    const { data: sessions, error: sessionsError } = await supabase
      .from("workout_sessions")
      .select(
        "id, routine_id, started_at, ended_at, duration_minutes, total_volume_kg, total_sets, total_reps, status, session_type"
      )
      .eq("profile_id", userId)
      .order("started_at", { ascending: false })
      .limit(10)

    if (sessionsError) {
      console.error("GET /api/client/workout-sessions/recent query error:", sessionsError)
      return NextResponse.json({ error: "Error al obtener sesiones" }, { status: 500 })
    }

    const sessionList: WorkoutSessionSummary[] = sessions ?? []
    return NextResponse.json({ sessions: sessionList })
  } catch (error) {
    console.error("GET /api/client/workout-sessions/recent unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
