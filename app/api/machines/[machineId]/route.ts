import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

type WeightUnit = "kg" | "lb"

interface MachineHistorySet {
  reps: number
  weight: number
  weight_kg: number
  entered_weight: number
  entered_weight_unit: WeightUnit
  display_weight: number
  display_unit: WeightUnit
  has_original_input: boolean
}

interface MachineHistoryEntry {
  id: string
  created_at: string
  notes: string | null
  total_volume: number
  session_xp: number
  factor_progreso: number
  has_original_weight_input: boolean
  sets: MachineHistorySet[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
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

function toWeightUnit(value: unknown): WeightUnit | null {
  if (value === "kg" || value === "lb") {
    return value
  }

  return null
}

function parseHistorySets(value: unknown): MachineHistorySet[] {
  if (!Array.isArray(value)) {
    return []
  }

  const sets: MachineHistorySet[] = []

  for (const item of value) {
    if (!isRecord(item)) {
      continue
    }

    const reps = toNonNegativeNumber(item.reps)
    const canonicalWeightKg = toNonNegativeNumber(item.weight_kg) || toNonNegativeNumber(item.weight)
    if (reps <= 0 || canonicalWeightKg <= 0) {
      continue
    }

    const originalUnit = toWeightUnit(item.entered_weight_unit)
    const originalWeight = toNonNegativeNumber(item.entered_weight)
    const hasOriginalInput = originalUnit !== null && originalWeight > 0
    const displayUnit: WeightUnit = hasOriginalInput ? originalUnit : "kg"
    const displayWeight = hasOriginalInput ? originalWeight : canonicalWeightKg

    sets.push({
      reps,
      weight: canonicalWeightKg,
      weight_kg: canonicalWeightKg,
      entered_weight: displayWeight,
      entered_weight_unit: displayUnit,
      display_weight: displayWeight,
      display_unit: displayUnit,
      has_original_input: hasOriginalInput,
    })
  }

  return sets
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

    const { data: historyRows, error: historyError } = await supabase
      .from("qr_sessions")
      .select("id, created_at, notes, total_volume, session_xp, factor_progreso, sets_data")
      .eq("athlete_id", userId)
      .eq("machine_id", machineId)
      .order("created_at", { ascending: false })
      .limit(10)

    if (historyError) {
      console.error("GET /api/machines/[machineId] history error:", historyError)
    }

    const history: MachineHistoryEntry[] = Array.isArray(historyRows)
      ? historyRows.map((row) => {
          const sets = parseHistorySets(row.sets_data)
          return {
            id: row.id,
            created_at: row.created_at,
            notes: typeof row.notes === "string" ? row.notes : null,
            total_volume: toNonNegativeNumber(row.total_volume),
            session_xp: toNonNegativeNumber(row.session_xp),
            factor_progreso: toNonNegativeNumber(row.factor_progreso),
            has_original_weight_input: sets.some((set) => set.has_original_input),
            sets,
          }
        })
      : []

    return NextResponse.json({ machine, history })
  } catch (error) {
    console.error("GET /api/machines/[machineId] unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
