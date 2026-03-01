import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { MUSCLE_GROUP_LABELS } from "@/lib/utils"

interface MachineRef {
  name: string
}

interface ExerciseRow {
  id: string
  name: string
  description: string | null
  muscle_groups: string[] | null
  equipment_type: string | null
  machine: MachineRef | MachineRef[] | null
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const coachId = sessionOrResponse.userId

  try {
    const supabase = await createClient()

    // Get coach's gym_id to include gym-specific exercises alongside public ones
    const { data: profile } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", coachId)
      .maybeSingle()

    const gymId = profile?.gym_id

    let query = supabase
      .from("exercises")
      .select("id, name, description, muscle_groups, equipment_type, machine:machines!machine_id(name)")
      .order("name", { ascending: true })

    if (gymId) {
      query = query.or(`is_public.eq.true,gym_id.eq.${gymId}`)
    } else {
      query = query.eq("is_public", true)
    }

    const { data, error } = await query

    if (error) {
      console.error("GET /api/trainer/exercises query error:", error)
      return NextResponse.json({ error: "Error al obtener ejercicios" }, { status: 500 })
    }

    const exercises = ((data ?? []) as ExerciseRow[]).map((ex) => {
      const machine = Array.isArray(ex.machine) ? ex.machine[0] ?? null : ex.machine
      const muscleGroups = ex.muscle_groups ?? []
      const firstMuscle = muscleGroups[0]

      return {
        id: ex.id,
        name: ex.name,
        description: ex.description ?? "",
        muscles: muscleGroups.map((mg) => MUSCLE_GROUP_LABELS[mg] ?? mg),
        category: firstMuscle ? (MUSCLE_GROUP_LABELS[firstMuscle] ?? "Otros") : "Otros",
        machine: machine?.name ?? "Sin máquina",
      }
    })

    return NextResponse.json({ exercises })
  } catch (err) {
    console.error("GET /api/trainer/exercises unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
