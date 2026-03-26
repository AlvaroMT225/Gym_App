import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

interface WorkoutSessionRow {
  id: string
  started_at: string | null
  status: string | null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workoutSessionId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient(request)
    const userId = sessionOrResponse.userId

    const { data: session, error: fetchError } = await supabase
      .from("workout_sessions")
      .select("id, started_at, status")
      .eq("id", workoutSessionId)
      .eq("profile_id", userId)
      .maybeSingle()

    if (fetchError) {
      console.error("PATCH /api/client/workout-sessions/[id] fetch error:", fetchError)
      return NextResponse.json({ error: "Error al obtener sesión" }, { status: 500 })
    }

    if (!session) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
    }

    const row = session as WorkoutSessionRow

    if (row.status === "completed") {
      return NextResponse.json({ success: true, already_completed: true, workout_session_id: workoutSessionId })
    }

    const now = new Date().toISOString()
    const durationMinutes = row.started_at
      ? Math.round((new Date(now).getTime() - new Date(row.started_at).getTime()) / 60000)
      : null

    const { error: updateError } = await supabase
      .from("workout_sessions")
      .update({
        status: "completed",
        ended_at: now,
        duration_minutes: durationMinutes,
      })
      .eq("id", workoutSessionId)
      .eq("profile_id", userId)

    if (updateError) {
      console.error("PATCH /api/client/workout-sessions/[id] update error:", updateError)
      return NextResponse.json({ error: "Error al completar sesión" }, { status: 500 })
    }

    return NextResponse.json({ success: true, workout_session_id: workoutSessionId })
  } catch (error) {
    console.error("PATCH /api/client/workout-sessions/[id] unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
