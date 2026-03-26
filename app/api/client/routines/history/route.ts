import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

interface MachineRef {
  name: string | null
  primary_muscle_group: string | null
}

interface QrSessionRow {
  id: string
  created_at: string
  total_volume: number | null
  session_xp: number | null
  machine_id: string | null
  sets_data: unknown
  primary_muscle_group: string | null
  machines: MachineRef | MachineRef[] | null
}

function resolveMachine(machines: QrSessionRow["machines"]): MachineRef | null {
  if (!machines) return null
  if (Array.isArray(machines)) return machines[0] ?? null
  return machines
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

    const { data, error, count } = await supabase
      .from("qr_sessions")
      .select(
        `
        id,
        created_at,
        total_volume,
        session_xp,
        machine_id,
        sets_data,
        primary_muscle_group,
        machines(name, primary_muscle_group)
      `,
        { count: "exact" }
      )
      .eq("athlete_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("GET /api/client/routines/history query error:", error)
      return NextResponse.json({ error: "Error al obtener historial" }, { status: 500 })
    }

    const history = ((data ?? []) as QrSessionRow[]).map((row) => {
      const machine = resolveMachine(row.machines)
      return {
        id: row.id,
        createdAt: row.created_at,
        totalVolume: row.total_volume ?? 0,
        sessionXp: row.session_xp ?? 0,
        machineId: row.machine_id ?? null,
        setsData: row.sets_data ?? null,
        machineName: machine?.name ?? null,
        primaryMuscleGroup: machine?.primary_muscle_group ?? row.primary_muscle_group ?? null,
      }
    })

    return NextResponse.json({
      history,
      total: count ?? 0,
      page,
      limit,
    })
  } catch (error) {
    console.error("GET /api/client/routines/history unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
