import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import {
  parsePersistedTrainingSets,
  type PersistedHistorySet,
  type SessionSource,
} from "@/lib/manual-training-sessions"

interface MachineHistoryEntry {
  id: string
  created_at: string
  notes: string | null
  total_volume: number
  session_xp: number
  factor_progreso: number
  source: SessionSource
  competitive: boolean
  has_original_weight_input: boolean
  sets: PersistedHistorySet[]
}

function toNonNegativeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value >= 0 ? value : 0
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return parsed >= 0 ? parsed : 0
    }
  }

  return 0
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ machineId: string }> }
) {
  const { machineId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient(request)
    const userId = sessionOrResponse.userId

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", userId)
      .maybeSingle()

    if (profileError) {
      console.error("GET /api/machines/[machineId] profile error:", profileError)
      return NextResponse.json({ error: "Error al obtener maquina" }, { status: 500 })
    }

    if (!profile?.gym_id) {
      return NextResponse.json({ machine: null, history: [] satisfies MachineHistoryEntry[] })
    }

    const { data: machine, error: machineError } = await supabase
      .from("machines")
      .select("id, gym_id, name, description, muscle_groups, equipment_type, status, location, image_url, instructions, settings")
      .eq("id", machineId)
      .eq("gym_id", profile.gym_id)
      .maybeSingle()

    if (machineError) {
      console.error("GET /api/machines/[machineId] query error:", machineError)
      return NextResponse.json({ error: "Error al obtener maquina" }, { status: 500 })
    }

    if (!machine) {
      return NextResponse.json({ machine: null, history: [] satisfies MachineHistoryEntry[] })
    }

    const [
      { data: qrHistoryRows, error: qrHistoryError },
      { data: manualHistoryRows, error: manualHistoryError },
    ] = await Promise.all([
      supabase
        .from("qr_sessions")
        .select("id, created_at, notes, total_volume, session_xp, factor_progreso, sets_data")
        .eq("athlete_id", userId)
        .eq("machine_id", machineId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("manual_training_sessions")
        .select("id, created_at, notes, total_volume, sets_data")
        .eq("athlete_id", userId)
        .eq("machine_id", machineId)
        .order("created_at", { ascending: false })
        .limit(10),
    ])

    if (qrHistoryError) {
      console.error("GET /api/machines/[machineId] qr history error:", qrHistoryError)
    }

    if (manualHistoryError) {
      console.error("GET /api/machines/[machineId] manual history error:", manualHistoryError)
    }

    const qrHistory: MachineHistoryEntry[] = Array.isArray(qrHistoryRows)
      ? qrHistoryRows.map((row) => {
          const sets = parsePersistedTrainingSets(row.sets_data)
          return {
            id: row.id,
            created_at: row.created_at,
            notes: typeof row.notes === "string" ? row.notes : null,
            total_volume: toNonNegativeNumber(row.total_volume),
            session_xp: toNonNegativeNumber(row.session_xp),
            factor_progreso: toNonNegativeNumber(row.factor_progreso),
            source: "qr",
            competitive: true,
            has_original_weight_input: sets.some((set) => set.has_original_input),
            sets,
          }
        })
      : []

    const manualHistory: MachineHistoryEntry[] = Array.isArray(manualHistoryRows)
      ? manualHistoryRows.map((row) => {
          const sets = parsePersistedTrainingSets(row.sets_data)
          return {
            id: row.id,
            created_at: row.created_at,
            notes: typeof row.notes === "string" ? row.notes : null,
            total_volume: toNonNegativeNumber(row.total_volume),
            session_xp: 0,
            factor_progreso: 0,
            source: "manual",
            competitive: false,
            has_original_weight_input: sets.some((set) => set.has_original_input),
            sets,
          }
        })
      : []

    const history = [...qrHistory, ...manualHistory]
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
      .slice(0, 10)

    return NextResponse.json({ machine, history })
  } catch (error) {
    console.error("GET /api/machines/[machineId] unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
