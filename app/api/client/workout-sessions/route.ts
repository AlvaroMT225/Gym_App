import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { handleApiError, validateBody } from "@/lib/api-utils"
import { qrSessionBodySchema } from "@/lib/validations/athlete"

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
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const userId = sessionOrResponse.userId
    const days = parseDays(request.nextUrl.searchParams.get("days"))
    const startIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data: sessions, error: sessionsError } = await supabase
      .from("workout_sessions")
      .select(
        "id, routine_id, started_at, ended_at, duration_minutes, total_volume_kg, total_sets, total_reps, status, session_type"
      )
      .eq("profile_id", userId)
      .gte("started_at", startIso)
      .order("started_at", { ascending: false })

    if (sessionsError) {
      console.error("GET /api/client/workout-sessions query error:", sessionsError)
      return NextResponse.json({ error: "Error al obtener sesiones" }, { status: 500 })
    }

    const sessionList: WorkoutSessionSummary[] = sessions ?? []
    return NextResponse.json({ sessions: sessionList })
  } catch (error) {
    console.error("GET /api/client/workout-sessions unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const { machineId, sets, source } = await validateBody(request, qrSessionBodySchema)
    const sessionSource = source ?? "manual"

    const supabase = await createClient()
    const userId = sessionOrResponse.userId

    // Get user profile (gym_id)
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

    // Verify machine exists in user's gym
    const { data: machine, error: machineError } = await supabase
      .from("machines")
      .select("id")
      .eq("id", machineId)
      .eq("gym_id", profile.gym_id)
      .maybeSingle()

    if (machineError) {
      console.error("POST /api/client/workout-sessions machine error:", machineError)
      return NextResponse.json({ error: "Error al verificar máquina" }, { status: 500 })
    }

    if (!machine) {
      return NextResponse.json({ error: "Máquina no encontrada en tu gimnasio" }, { status: 404 })
    }

    // Compute session totals
    const totalSets = sets.length
    const totalReps = sets.reduce((sum, s) => sum + s.reps, 0)
    const totalVolumeKg = sets.reduce((sum, s) => sum + s.weight * s.reps, 0)
    const now = new Date().toISOString()

    // 1. Insert workout_session
    const { data: session, error: sessionError } = await supabase
      .from("workout_sessions")
      .insert({
        profile_id: userId,
        gym_id: profile.gym_id,
        started_at: now,
        ended_at: now,
        status: "completed",
        session_type: "gym",
        total_sets: totalSets,
        total_reps: totalReps,
        total_volume_kg: totalVolumeKg,
        notes: sessionSource,
      })
      .select("id")
      .single()

    if (sessionError || !session) {
      console.error("POST /api/client/workout-sessions insert session error:", sessionError)
      return NextResponse.json({ error: "Error al crear sesión" }, { status: 500 })
    }

    const sessionId = session.id

    // 2. Look up exercise for this machine (exercise_id is NOT NULL in workout_sets)
    // FIX 1: capture and log exercise query errors instead of swallowing them
    const { data: machineExercise, error: exerciseError } = await supabase
      .from("exercises")
      .select("id")
      .eq("machine_id", machineId)
      .limit(1)
      .maybeSingle()

    if (exerciseError) {
      console.error("POST /api/client/workout-sessions exercise query error:", exerciseError)
    }

    // FIX 2: fallback to any gym exercise instead of silently skipping sets
    let exerciseId: string | undefined = machineExercise?.id

    if (!exerciseId) {
      const { data: fallbackExercise } = await supabase
        .from("exercises")
        .select("id")
        .limit(1)
        .maybeSingle()

      if (!fallbackExercise?.id) {
        console.error("POST /api/client/workout-sessions: no exercises found in gym — sets skipped")
        return NextResponse.json({
          success: true,
          sessionId,
          setsCount: 0,
          warning: "Sesión creada pero sin sets: no hay ejercicios configurados",
        })
      }
      exerciseId = fallbackExercise.id
    }

    // 3. Insert workout_sets
    const setRows = sets.map((s, i) => ({
      session_id: sessionId,
      exercise_id: exerciseId,
      set_number: i + 1,
      reps_done: s.reps,
      weight_kg: s.weight,
      rpe: s.rpe ?? null,
      origin: "manual" as const,
    }))

    const { error: setsError } = await supabase
      .from("workout_sets")
      .insert(setRows)

    // FIX 3: log full setsError detail with JSON.stringify
    if (setsError) {
      console.error("POST /api/client/workout-sessions insert sets error:", JSON.stringify(setsError))
      return NextResponse.json(
        { success: true, sessionId, setsCount: 0, warning: setsError.message },
        { status: 207 }
      )
    }

    // 4. Insert session_machines (track machine usage)
    const { error: smError } = await supabase
      .from("session_machines")
      .insert({ session_id: sessionId, machine_id: machineId })

    if (smError) {
      console.error("POST /api/client/workout-sessions insert session_machines error:", smError)
      // Non-fatal — session and sets are already saved
    }

    // FIX 4: setsCount reflects actual rows inserted, not the pre-computed total
    return NextResponse.json({ success: true, sessionId, setsCount: setRows.length })
  } catch (error) {
    console.error("POST /api/client/workout-sessions unexpected error:", error)
    return handleApiError(error)
  }
}
