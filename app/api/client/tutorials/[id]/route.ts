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
  steps: unknown
  content: unknown
  gif_url: string | null
  video_url: string | null
  difficulty_level: number | null
  duration_minutes: number | null
}

interface TutorialProgressRow {
  completed: boolean | null
  progress_percent: number | null
  completed_at: string | null
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  if (typeof value === "string") {
    const text = value.trim()
    if (!text.startsWith("{") || !text.endsWith("}")) return null
    try {
      const parsed = JSON.parse(text)
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      return null
    }
  }

  return null
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

function readArrayFromContent(
  content: Record<string, unknown> | null,
  keys: string[]
): string[] {
  if (!content) return []

  for (const key of keys) {
    if (key in content) {
      return parseStringList(content[key])
    }
  }

  return []
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
      console.error("GET /api/client/tutorials/[id] profile query error:", profileError)
      return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 })
    }

    const gymId = (profile as ProfileRow | null)?.gym_id
    if (!gymId) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })
    }

    const { data: tutorial, error: tutorialError } = await supabase
      .from("machine_tutorials")
      .select(
        "id, exercise_id, machine_id, title, steps, content, gif_url, video_url, difficulty_level, duration_minutes"
      )
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle()

    if (tutorialError) {
      console.error("GET /api/client/tutorials/[id] tutorial query error:", tutorialError)
      return NextResponse.json({ error: "Error al obtener tutorial" }, { status: 500 })
    }

    if (!tutorial) {
      const { data: legacyMachine, error: legacyMachineError } = await supabase
        .from("machines")
        .select("id")
        .eq("id", id)
        .eq("gym_id", gymId)
        .maybeSingle()

      if (legacyMachineError) {
        console.error(
          "GET /api/client/tutorials/[id] legacy machine fallback query error:",
          legacyMachineError
        )
        return NextResponse.json({ error: "Error al obtener tutorial" }, { status: 500 })
      }

      if (legacyMachine) {
        return NextResponse.json(
          {
            error: "La ruta por machine_id fue deprecada",
            deprecated: true,
            use_list_filter: `/api/client/tutorials?machine_id=${encodeURIComponent(id)}`,
          },
          { status: 410 }
        )
      }

      return NextResponse.json({ error: "Tutorial no encontrado" }, { status: 404 })
    }

    const tutorialRow = tutorial as TutorialRow

    const [{ data: exercise, error: exerciseError }, { data: progress, error: progressError }] =
      await Promise.all([
        supabase
          .from("exercises")
          .select("id, name, muscle_groups")
          .eq("id", tutorialRow.exercise_id)
          .or(`gym_id.eq.${gymId},is_public.eq.true`)
          .maybeSingle(),
        supabase
          .from("user_tutorial_progress")
          .select("completed, progress_percent, completed_at")
          .eq("profile_id", userId)
          .eq("tutorial_id", tutorialRow.id)
          .maybeSingle(),
      ])

    if (exerciseError) {
      console.error("GET /api/client/tutorials/[id] exercise query error:", exerciseError)
      return NextResponse.json({ error: "Error al obtener ejercicio" }, { status: 500 })
    }

    if (!exercise) {
      return NextResponse.json({ error: "Tutorial no disponible" }, { status: 404 })
    }

    if (progressError) {
      console.error("GET /api/client/tutorials/[id] progress query error:", progressError)
      return NextResponse.json({ error: "Error al obtener progreso de tutorial" }, { status: 500 })
    }

    let machineRow: MachineRow | null = null
    if (tutorialRow.machine_id) {
      const { data: machine, error: machineError } = await supabase
        .from("machines")
        .select("id, name")
        .eq("id", tutorialRow.machine_id)
        .eq("gym_id", gymId)
        .maybeSingle()

      if (machineError) {
        console.error("GET /api/client/tutorials/[id] machine query error:", machineError)
        return NextResponse.json({ error: "Error al obtener máquina" }, { status: 500 })
      }

      machineRow = (machine ?? null) as MachineRow | null
    }

    const exerciseRow = exercise as ExerciseRow
    const progressRow = (progress ?? null) as TutorialProgressRow | null
    const progressPercent = Number(progressRow?.progress_percent ?? 0)
    const isCompleted = Boolean(progressRow?.completed) || progressPercent >= 100
    const contentJson = parseJsonObject(tutorialRow.content)

    return NextResponse.json({
      item: {
        id: tutorialRow.id,
        exercise_id: tutorialRow.exercise_id,
        exercise_name: exerciseRow.name,
        machine_id: tutorialRow.machine_id,
        machine_name: machineRow?.name ?? null,
        muscle_groups: exerciseRow.muscle_groups ?? [],
        title: tutorialRow.title,
        steps: parseSteps(tutorialRow.steps),
        safety_tips: readArrayFromContent(contentJson, ["safetyTips", "safety_tips", "safety", "tips"]),
        common_errors: readArrayFromContent(contentJson, ["commonErrors", "common_errors", "errors"]),
        gif_url: tutorialRow.gif_url ?? null,
        video_url: tutorialRow.video_url ?? null,
        difficulty_level: tutorialRow.difficulty_level ?? null,
        duration_minutes: tutorialRow.duration_minutes ?? null,
        is_completed: isCompleted,
        progress_percent: progressPercent,
        completed_at: progressRow?.completed_at ?? null,
      },
    })
  } catch (error) {
    console.error("GET /api/client/tutorials/[id] unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
