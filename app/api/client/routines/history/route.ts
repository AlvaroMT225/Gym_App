import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { parseSessionMetadataNotes } from "@/lib/workout-flow-context"

interface MachineRef {
  name: string | null
  primary_muscle_group: string | null
}

interface ExerciseRef {
  id: string
  name: string | null
}

interface QrSessionRef {
  id: string
  machine_id: string | null
  exercise_id: string | null
  session_xp: number | null
  sets_data: unknown
  notes: string | null
  exercise: ExerciseRef | ExerciseRef[] | null
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
  exercise_id: string | null
  notes: string | null
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

function resolveQrExerciseId(row: { exercise_id: string | null; notes: string | null }) {
  return row.exercise_id ?? parseSessionMetadataNotes(row.notes).exerciseId
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
            exercise_id,
            session_xp,
            sets_data,
            notes,
            exercise:exercises(id, name),
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
        .select("machine_id, exercise_id, notes, sets_data")
        .eq("athlete_id", userId),
    ])

    if (sessionsResult.error) {
      console.error("GET /api/client/routines/history sessions query error:", sessionsResult.error)
      return NextResponse.json({ error: "Error al obtener historial" }, { status: 500 })
    }

    const sessions = (sessionsResult.data ?? []) as WorkoutSessionRow[]
    const exerciseIds = new Set<string>()
    for (const session of sessions) {
      for (const qr of session.qr_sessions ?? []) {
        const exerciseId = resolveQrExerciseId(qr)
        if (exerciseId) exerciseIds.add(exerciseId)
      }
    }

    const exerciseNameById = new Map<string, string | null>()
    if (exerciseIds.size > 0) {
      const { data: exerciseRows, error: exerciseError } = await supabase
        .from("exercises")
        .select("id, name")
        .in("id", [...exerciseIds])

      if (exerciseError) {
        console.error("GET /api/client/routines/history exercises query error:", exerciseError)
        return NextResponse.json({ error: "Error al resolver ejercicios del historial" }, { status: 500 })
      }

      for (const row of ((exerciseRows ?? []) as ExerciseRef[])) {
        exerciseNameById.set(row.id, row.name)
      }
    }

    // Build all-time max weight_kg per exercise. Legacy rows without exercise context keep machine fallback.
    const allTimePrByExercise = new Map<string, number>()
    const allTimePrByMachine = new Map<string, number>()
    for (const row of ((allTimePrResult.data ?? []) as AllTimePrRow[])) {
      const maxKg = maxWeightKgFromSets(row.sets_data)
      const exerciseId = resolveQrExerciseId(row)

      if (exerciseId) {
        const current = allTimePrByExercise.get(exerciseId) ?? 0
        if (maxKg > current) allTimePrByExercise.set(exerciseId, maxKg)
        continue
      }

      if (row.machine_id) {
        const current = allTimePrByMachine.get(row.machine_id) ?? 0
        if (maxKg > current) allTimePrByMachine.set(row.machine_id, maxKg)
      }
    }

    const history = sessions.map((session) => {
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
        const joinedExercise = resolveSingle(qr.exercise)
        const exerciseId = resolveQrExerciseId(qr)
        const exerciseName = exerciseId
          ? (joinedExercise?.id === exerciseId ? joinedExercise.name : exerciseNameById.get(exerciseId) ?? null)
          : null
        const pr = extractPrFromSets(qr.sets_data)
        const allTimePr = exerciseId
          ? (allTimePrByExercise.get(exerciseId) ?? 0)
          : qr.machine_id
            ? (allTimePrByMachine.get(qr.machine_id) ?? 0)
            : 0
        return {
          id: qr.id,
          exerciseId,
          exerciseName,
          exercise_id: exerciseId,
          exercise_name: exerciseName,
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
