import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { insertManualTrainingSession, parseManualSessionBody } from "@/lib/manual-training-sessions"

export async function POST(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient(request)
    const athleteId = sessionOrResponse.userId

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", athleteId)
      .maybeSingle()

    if (profileError) {
      console.error("POST /api/client/manual-sessions profile error:", profileError)
      return NextResponse.json({ error: "No se pudo obtener tu perfil." }, { status: 500 })
    }

    if (!profile?.gym_id) {
      return NextResponse.json({ error: "Tu perfil no tiene gimnasio asignado." }, { status: 400 })
    }

    const rawBody: unknown = await request.json()
    const body = parseManualSessionBody(rawBody)
    if (!body) {
      return NextResponse.json({ error: "El payload de sesión manual no es válido." }, { status: 400 })
    }

    const session = await insertManualTrainingSession({
      supabase,
      athleteId,
      gymId: profile.gym_id,
      machineId: body.machine_id,
      setsData: body.sets_data,
      notes: body.notes,
      routineId: body.routineId,
      exerciseId: body.exerciseId,
      exerciseName: body.exerciseName,
    })

    return NextResponse.json({
      success: true,
      session_id: session.id,
      workout_session_id: session.workout_session_id,
      total_volume: session.total_volume,
      total_sets: session.totalSets,
      total_reps: session.totalReps,
      source: "manual",
      competitive: false,
    })
  } catch (error) {
    console.error("POST /api/client/manual-sessions unexpected error:", error)
    const message = error instanceof Error ? error.message : "No se pudo guardar la sesión manual."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
