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
  gif_url: string | null
  video_url: string | null
  difficulty_level: number | null
  duration_minutes: number | null
  steps: unknown
}

interface TutorialProgressRow {
  tutorial_id: string
  completed: boolean | null
  progress_percent: number | null
}

interface TutorialListItemDto {
  id: string
  machineId: string
  machineName: string
  muscles: string[]
  tutorialId: string
  title: string
  gifUrl: string | null
  videoUrl: string | null
  difficultyLevel: number | null
  durationMinutes: number | null
  steps: string[]
  completed: boolean
  progressPercent: number
}

function parseStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (typeof item === "string") return item.trim()
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>
        if (typeof record.description === "string") return record.description.trim()
        if (typeof record.title === "string") return record.title.trim()
        if (typeof record.text === "string") return record.text.trim()
      }
      return ""
    })
    .filter((item) => item.length > 0)
}

function parseSteps(value: unknown): string[] {
  if (typeof value === "string") {
    try {
      return parseStringList(JSON.parse(value))
    } catch {
      return []
    }
  }
  return parseStringList(value)
}

export async function GET(request: NextRequest) {
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
      .select("id, machine_id, title, gif_url, video_url, difficulty_level, duration_minutes, steps")
      .eq("is_active", true)
      .in("machine_id", machineIds)
      .order("machine_id", { ascending: true })
      .order("order_index", { ascending: true })

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
          id: row.id,
          machineId: row.machine_id,
          machineName: machine.name,
          muscles: machine.muscle_groups ?? [],
          tutorialId: row.id,
          title: row.title,
          gifUrl: row.gif_url ?? null,
          videoUrl: row.video_url ?? null,
          difficultyLevel: row.difficulty_level ?? null,
          durationMinutes: row.duration_minutes ?? null,
          steps: parseSteps(row.steps),
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
