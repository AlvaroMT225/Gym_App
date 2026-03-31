import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

interface ProfileRow {
  gym_id: string | null
}

interface ExerciseRow {
  id: string
  name: string
  muscle_groups: string[] | null
}

interface MachineRow {
  id: string
  name: string
}

interface TutorialRow {
  id: string
  exercise_id: string
  machine_id: string | null
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
  exercise_id: string
  exercise_name: string
  machine_id: string | null
  machine_name: string | null
  muscle_groups: string[]
  title: string
  gif_url: string | null
  video_url: string | null
  difficulty_level: number | null
  duration_minutes: number | null
  steps: string[]
  is_completed: boolean
  progress_percent: number
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
    const machineIdFilter = request.nextUrl.searchParams.get("machine_id")?.trim() || null

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

    if (machineIdFilter) {
      const { data: machineFilter, error: machineFilterError } = await supabase
        .from("machines")
        .select("id")
        .eq("id", machineIdFilter)
        .eq("gym_id", gymId)
        .maybeSingle()

      if (machineFilterError) {
        console.error("GET /api/client/tutorials machine filter query error:", machineFilterError)
        return NextResponse.json({ error: "Error al validar máquina" }, { status: 500 })
      }

      if (!machineFilter) {
        return NextResponse.json({ error: "Máquina no encontrada" }, { status: 404 })
      }
    }

    const { data: exercisesData, error: exercisesError } = await supabase
      .from("exercises")
      .select("id, name, muscle_groups")
      .or(`gym_id.eq.${gymId},is_public.eq.true`)
      .order("name", { ascending: true })

    if (exercisesError) {
      console.error("GET /api/client/tutorials exercises query error:", exercisesError)
      return NextResponse.json({ error: "Error al obtener ejercicios" }, { status: 500 })
    }

    const exercises = (exercisesData ?? []) as ExerciseRow[]
    if (exercises.length === 0) {
      return NextResponse.json({ items: [] as TutorialListItemDto[] })
    }

    const exerciseIds = exercises.map((exercise) => exercise.id)
    const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]))

    let tutorialsQuery = supabase
      .from("machine_tutorials")
      .select(
        "id, exercise_id, machine_id, title, gif_url, video_url, difficulty_level, duration_minutes, steps"
      )
      .eq("is_active", true)
      .in("exercise_id", exerciseIds)
      .order("order_index", { ascending: true })
      .order("title", { ascending: true })

    if (machineIdFilter) {
      tutorialsQuery = tutorialsQuery.eq("machine_id", machineIdFilter)
    }

    const { data: tutorialsData, error: tutorialsError } = await tutorialsQuery

    if (tutorialsError) {
      console.error("GET /api/client/tutorials tutorials query error:", tutorialsError)
      return NextResponse.json({ error: "Error al obtener tutoriales" }, { status: 500 })
    }

    const tutorialRows = (tutorialsData ?? []) as TutorialRow[]
    if (tutorialRows.length === 0) {
      return NextResponse.json({ items: [] as TutorialListItemDto[] })
    }

    const tutorialIds = tutorialRows.map((row) => row.id)
    const machineIds = Array.from(
      new Set(
        tutorialRows
          .map((row) => row.machine_id)
          .filter((value): value is string => typeof value === "string" && value.length > 0)
      )
    )

    const [{ data: progressData, error: progressError }, { data: machinesData, error: machinesError }] =
      await Promise.all([
        supabase
          .from("user_tutorial_progress")
          .select("tutorial_id, completed, progress_percent")
          .eq("profile_id", userId)
          .in("tutorial_id", tutorialIds),
        machineIds.length > 0
          ? supabase
              .from("machines")
              .select("id, name")
              .eq("gym_id", gymId)
              .in("id", machineIds)
          : Promise.resolve({ data: [] as MachineRow[], error: null }),
      ])

    if (progressError) {
      console.error("GET /api/client/tutorials progress query error:", progressError)
      return NextResponse.json({ error: "Error al obtener progreso de tutoriales" }, { status: 500 })
    }

    if (machinesError) {
      console.error("GET /api/client/tutorials machines query error:", machinesError)
      return NextResponse.json({ error: "Error al obtener máquinas" }, { status: 500 })
    }

    const progressByTutorialId = new Map<string, TutorialProgressRow>()
    for (const row of (progressData ?? []) as TutorialProgressRow[]) {
      progressByTutorialId.set(row.tutorial_id, row)
    }

    const machineById = new Map(
      ((machinesData ?? []) as MachineRow[]).map((machine) => [machine.id, machine])
    )

    const items: TutorialListItemDto[] = tutorialRows
      .map((row) => {
        const exercise = exerciseById.get(row.exercise_id)
        if (!exercise) return null

        const progress = progressByTutorialId.get(row.id)
        const progressPercent = Number(progress?.progress_percent ?? 0)
        const isCompleted = Boolean(progress?.completed) || progressPercent >= 100
        const machine = row.machine_id ? machineById.get(row.machine_id) ?? null : null

        return {
          id: row.id,
          exercise_id: row.exercise_id,
          exercise_name: exercise.name,
          machine_id: row.machine_id,
          machine_name: machine?.name ?? null,
          muscle_groups: exercise.muscle_groups ?? [],
          title: row.title,
          gif_url: row.gif_url ?? null,
          video_url: row.video_url ?? null,
          difficulty_level: row.difficulty_level ?? null,
          duration_minutes: row.duration_minutes ?? null,
          steps: parseSteps(row.steps),
          is_completed: isCompleted,
          progress_percent: progressPercent,
        }
      })
      .filter((item): item is TutorialListItemDto => item !== null)
      .sort((a, b) => a.exercise_name.localeCompare(b.exercise_name))

    return NextResponse.json({ items })
  } catch (error) {
    console.error("GET /api/client/tutorials unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
