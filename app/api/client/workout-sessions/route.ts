import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import {
  fetchCombinedWorkoutSessionSummaries,
  insertManualTrainingSession,
  parseLegacyManualSessionBody,
} from "@/lib/manual-training-sessions"

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
      console.error("GET /api/client/workout-sessions query error:", sessionsError)
      return NextResponse.json({ error: "Error al obtener sesiones" }, { status: 500 })
    }

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error("GET /api/client/workout-sessions unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const rawBody: unknown = await request.json()
    const body = parseLegacyManualSessionBody(rawBody)
    if (!body) {
      return NextResponse.json({ error: "El payload de sesión manual no es válido." }, { status: 400 })
    }

    if (body.source === "qr") {
      return NextResponse.json(
        { error: "El registro manual no puede usarse para sesiones competitivas con QR." },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const userId = sessionOrResponse.userId

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", userId)
      .maybeSingle()

    if (profileError) {
      console.error("POST /api/client/workout-sessions profile error:", profileError)
      return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 })
    }

    if (!profile?.gym_id) {
      return NextResponse.json({ error: "Perfil sin gimnasio asignado" }, { status: 400 })
    }

    const session = await insertManualTrainingSession({
      supabase,
      athleteId: userId,
      gymId: profile.gym_id,
      machineId: body.machine_id,
      setsData: body.sets_data,
      notes: body.notes,
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      setsCount: session.totalSets,
      source: "manual",
      competitive: false,
    })
  } catch (error) {
    console.error("POST /api/client/workout-sessions unexpected error:", error)
    const message = error instanceof Error ? error.message : "No se pudo guardar la sesión manual."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
