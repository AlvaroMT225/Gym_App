import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

interface ProfileRow {
  gym_id: string | null
}

interface MachineRow {
  id: string
  name: string
  muscle_groups: string[] | null
}

interface TutorialRow {
  id: string
  machine_id: string
  title: string
}

interface TutorialProgressRow {
  tutorial_id: string
  completed: boolean | null
  progress_percent: number | null
}

interface TutorialListItemDto {
  machineId: string
  machineName: string
  muscles: string[]
  tutorialId: string
  title: string
  completed: boolean
  progressPercent: number
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const userId = sessionOrResponse.userId

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", userId)
      .maybeSingle()

    if (profileError) {
      console.error("GET /api/client/tutorials profile query error:", profileError)
      return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 })
    }

    if (!(profile as ProfileRow | null)?.gym_id) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })
    }

    const gymId = (profile as ProfileRow).gym_id as string

    const { data: machinesData, error: machinesError } = await supabase
      .from("machines")
      .select("id, name, muscle_groups")
      .eq("gym_id", gymId)

    if (machinesError) {
      console.error("GET /api/client/tutorials machines query error:", machinesError)
      return NextResponse.json({ error: "Error al obtener máquinas" }, { status: 500 })
    }

    const machines = (machinesData ?? []) as MachineRow[]
    if (machines.length === 0) {
      return NextResponse.json({ items: [] as TutorialListItemDto[] })
    }

    const machineIds = machines.map((machine) => machine.id)
    const machineById = new Map(machines.map((machine) => [machine.id, machine]))

    const { data: tutorialsData, error: tutorialsError } = await supabase
      .from("machine_tutorials")
      .select("id, machine_id, title")
      .eq("is_active", true)
      .eq("order_index", 1)
      .in("machine_id", machineIds)

    if (tutorialsError) {
      console.error("GET /api/client/tutorials tutorials query error:", tutorialsError)
      return NextResponse.json({ error: "Error al obtener tutoriales" }, { status: 500 })
    }

    const tutorialRows = (tutorialsData ?? []) as TutorialRow[]
    if (tutorialRows.length === 0) {
      return NextResponse.json({ items: [] as TutorialListItemDto[] })
    }

    const tutorialIds = tutorialRows.map((row) => row.id)

    const { data: progressData, error: progressError } = await supabase
      .from("user_tutorial_progress")
      .select("tutorial_id, completed, progress_percent")
      .eq("profile_id", userId)
      .in("tutorial_id", tutorialIds)

    if (progressError) {
      console.error("GET /api/client/tutorials progress query error:", progressError)
      return NextResponse.json({ error: "Error al obtener progreso de tutoriales" }, { status: 500 })
    }

    const progressByTutorialId = new Map<string, TutorialProgressRow>()
    for (const row of (progressData ?? []) as TutorialProgressRow[]) {
      progressByTutorialId.set(row.tutorial_id, row)
    }

    const items: TutorialListItemDto[] = tutorialRows
      .map((row) => {
        const machine = machineById.get(row.machine_id)
        if (!machine) return null

        const progress = progressByTutorialId.get(row.id)
        const progressPercent = Number(progress?.progress_percent ?? 0)
        const completed = Boolean(progress?.completed) || progressPercent >= 100

        return {
          machineId: row.machine_id,
          machineName: machine.name,
          muscles: machine.muscle_groups ?? [],
          tutorialId: row.id,
          title: row.title,
          completed,
          progressPercent,
        }
      })
      .filter((item): item is TutorialListItemDto => item !== null)
      .sort((a, b) => a.machineName.localeCompare(b.machineName))

    return NextResponse.json({ items })
  } catch (error) {
    console.error("GET /api/client/tutorials unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
