import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

type FocusParam = "upper" | "lower" | "full"

const UPPER_MUSCLE_GROUPS = ["chest", "back", "shoulders", "biceps", "triceps", "arms"]
const LOWER_MUSCLE_GROUPS = ["legs", "glutes", "core"]

interface MachineRef {
  name: string | null
}

interface ExerciseRow {
  id: string
  name: string
  muscle_groups: string[] | null
  machine_id: string | null
  machines: MachineRef | MachineRef[] | null
}

function resolveFocus(value: string | null): FocusParam {
  if (value === "upper" || value === "lower") return value
  return "full"
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const userId = sessionOrResponse.userId
  const focus = resolveFocus(request.nextUrl.searchParams.get("focus"))
  const search = request.nextUrl.searchParams.get("search")?.trim() ?? ""

  try {
    const supabase = await createClient(request)

    const { data: profile } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", userId)
      .maybeSingle()

    const gymId = profile?.gym_id

    let query = supabase
      .from("exercises")
      .select("id, name, muscle_groups, machine_id, machines(name)")
      .order("name", { ascending: true })

    if (gymId) {
      query = query.or(`is_public.eq.true,gym_id.eq.${gymId}`)
    } else {
      query = query.eq("is_public", true)
    }

    if (focus === "upper") {
      query = query.overlaps("muscle_groups", UPPER_MUSCLE_GROUPS)
    } else if (focus === "lower") {
      query = query.overlaps("muscle_groups", LOWER_MUSCLE_GROUPS)
    }

    if (search.length > 0) {
      query = query.ilike("name", `%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error("GET /api/client/exercises query error:", error)
      return NextResponse.json({ error: "Error al obtener ejercicios" }, { status: 500 })
    }

    const exercises = ((data ?? []) as ExerciseRow[]).map((ex) => {
      const machine = Array.isArray(ex.machines) ? ex.machines[0] ?? null : ex.machines
      return {
        id: ex.id,
        name: ex.name,
        muscleGroups: ex.muscle_groups ?? [],
        machineId: ex.machine_id ?? null,
        machineName: machine?.name ?? null,
      }
    })

    return NextResponse.json({ exercises })
  } catch (err) {
    console.error("GET /api/client/exercises unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
