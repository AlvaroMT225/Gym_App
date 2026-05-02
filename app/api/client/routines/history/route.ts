import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

interface MachineRef {
  name: string | null
  primary_muscle_group: string | null
}

interface QrSessionRef {
  id: string
  machine_id: string | null
  session_xp: number | null
  sets_data: unknown
  machines: MachineRef | MachineRef[] | null
}

interface RoutineRef {
  name: string | null
}

interface WorkoutSessionRow {
  id: string
  routine_id: string | null
  session_type: string | null
  source_flow: string | null
  started_at: string
  ended_at: string | null
  duration_minutes: number | null
  routine: RoutineRef | RoutineRef[] | null
  qr_sessions: QrSessionRef[]
}

interface AllTimePrRow {
  machine_id: string | null
  sets_data: unknown
}

function resolveSingle<T>(value: T | T[] | null): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function extractPrFromSets(setsData: unknown): {
  displayWeight: number
  displayUnit: "kg" | "lb"
  reps: number
  weightKg: number
} | null {
  if (!Array.isArray(setsData) || setsData.length === 0) return null
  let best: { weightKg: number; reps: number; displayWeight: number; displayUnit: "kg" | "lb" } | null = null
  for (const set of setsData) {
    if (typeof set !== "object" || set === null) continue
    const s = set as Record<string, unknown>
    const weightKg =
      typeof s.weight_kg === "number" && s.weight_kg > 0
        ? s.weight_kg
        : typeof s.weight === "number" && s.weight > 0
          ? s.weight
          : 0
    const reps = typeof s.reps === "number" && s.reps > 0 ? s.reps : 0
    if (weightKg === 0 || reps === 0) continue
    const isBetter =
      !best || weightKg > best.weightKg || (weightKg === best.weightKg && reps > best.reps)
    if (isBetter) {
      const hasOriginal = s.entered_weight_unit === "lb" || s.entered_weight_unit === "kg"
      const displayUnit: "kg" | "lb" = hasOriginal ? (s.entered_weight_unit as "kg" | "lb") : "kg"
      const displayWeight: number =
        hasOriginal && typeof s.entered_weight === "number" && s.entered_weight > 0
          ? s.entered_weight
          : weightKg
      best = { weightKg, reps, displayWeight, displayUnit }
    }
  }
  return best
}

function maxWeightKgFromSets(setsData: unknown): number {
  if (!Array.isArray(setsData)) return 0
  let max = 0
  for (const set of setsData) {
    if (typeof set !== "object" || set === null) continue
    const s = set as Record<string, unknown>
    const wKg =
      typeof s.weight_kg === "number" && s.weight_kg > 0
        ? s.weight_kg
        : typeof s.weight === "number" && s.weight > 0
          ? s.weight
          : 0
    if (wKg > max) max = wKg
  }
  return max
}

function parsePage(value: string | null): number {
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

function parseLimit(value: string | null): number {
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 && n <= 100 ? n : 20
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient(request)
    const userId = sessionOrResponse.userId

    const page = parsePage(request.nextUrl.searchParams.get("page"))
    const limit = parseLimit(request.nextUrl.searchParams.get("limit"))
    const offset = (page - 1) * limit

    const [sessionsResult, allTimePrResult] = await Promise.all([
      supabase
        .from("workout_sessions")
        .select(
          `
          id,
          routine_id,
          session_type,
          source_flow,
          started_at,
          ended_at,
          duration_minutes,
          routine:routines(name),
          qr_sessions(
            id,
            machine_id,
            session_xp,
            sets_data,
            machines(name, primary_muscle_group)
          )
          `,
          { count: "exact" }
        )
        .eq("profile_id", userId)
        .eq("status", "completed")
        .not("routine_id", "is", null)
        .order("started_at", { ascending: false })
        .range(offset, offset + limit - 1),
      supabase
        .from("qr_sessions")
        .select("machine_id, sets_data")
        .eq("athlete_id", userId),
    ])

    if (sessionsResult.error) {
      console.error("GET /api/client/routines/history sessions query error:", sessionsResult.error)
      return NextResponse.json({ error: "Error al obtener historial" }, { status: 500 })
    }

    // Build all-time max weight_kg per machine for this athlete
    const allTimePrByMachine = new Map<string, number>()
    for (const row of ((allTimePrResult.data ?? []) as AllTimePrRow[])) {
      if (!row.machine_id) continue
      const maxKg = maxWeightKgFromSets(row.sets_data)
      const current = allTimePrByMachine.get(row.machine_id) ?? 0
      if (maxKg > current) allTimePrByMachine.set(row.machine_id, maxKg)
    }

    const history = ((sessionsResult.data ?? []) as WorkoutSessionRow[]).map((session) => {
      const routine = resolveSingle(session.routine)
      const routineName = routine?.name ?? "Rutina completada"

      const durationMinutes =
        typeof session.duration_minutes === "number" && session.duration_minutes > 0
          ? Math.round(session.duration_minutes)
          : session.ended_at
            ? Math.round(
                (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) /
                  60000
              )
            : null

      const exercises = (session.qr_sessions ?? []).map((qr) => {
        const machine = resolveSingle(qr.machines)
        const pr = extractPrFromSets(qr.sets_data)
        const allTimePr = qr.machine_id ? (allTimePrByMachine.get(qr.machine_id) ?? 0) : 0
        return {
          id: qr.id,
          machineId: qr.machine_id ?? null,
          machineName: machine?.name ?? null,
          sessionXp: qr.session_xp ?? 0,
          prWeight: pr?.displayWeight ?? null,
          prReps: pr?.reps ?? null,
          prUnit: pr?.displayUnit ?? "kg",
          isNewRecord: pr !== null && allTimePr > 0 && pr.weightKg >= allTimePr,
        }
      })

      const totalXp = exercises.reduce((sum, ex) => sum + ex.sessionXp, 0)

      return {
        id: session.id,
        routineId: session.routine_id ?? null,
        routine_id: session.routine_id,
        session_type: "routine",
        source_flow: "routine",
        workoutSessionType: session.session_type,
        workoutSourceFlow: session.source_flow,
        routineName,
        startedAt: session.started_at,
        completedAt: session.ended_at ?? session.started_at,
        durationMinutes,
        exerciseCount: exercises.length,
        totalXp,
        exercises,
      }
    })

    return NextResponse.json({
      history,
      total: sessionsResult.count ?? 0,
      page,
      limit,
    })
  } catch (error) {
    console.error("GET /api/client/routines/history unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
