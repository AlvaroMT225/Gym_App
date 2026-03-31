import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

interface ProfileRow {
  gym_id: string | null
}

interface MachineRow {
  id: string
  gym_id: string
  name: string
  muscle_groups: string[] | null
}

interface TutorialRow {
  id: string
  machine_id: string
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
      console.error("GET /api/client/tutorials/[machineId] profile query error:", profileError)
      return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 })
    }

    const gymId = (profile as ProfileRow | null)?.gym_id
    if (!gymId) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })
    }

    const { data: machine, error: machineError } = await supabase
      .from("machines")
      .select("id, gym_id, name, muscle_groups")
      .eq("id", machineId)
      .maybeSingle()

    if (machineError) {
      console.error("GET /api/client/tutorials/[machineId] machine query error:", machineError)
      return NextResponse.json({ error: "Error al obtener máquina" }, { status: 500 })
    }

    if (!machine) {
      return NextResponse.json({ error: "Máquina no encontrada" }, { status: 404 })
    }

    const machineRow = machine as MachineRow
    if (machineRow.gym_id !== gymId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { data: tutorial, error: tutorialError } = await supabase
      .from("machine_tutorials")
      .select("id, machine_id, title, steps, content, gif_url, video_url, difficulty_level, duration_minutes")
      .eq("machine_id", machineId)
      .eq("is_active", true)
      .order("order_index", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (tutorialError) {
      console.error("GET /api/client/tutorials/[machineId] tutorial query error:", tutorialError)
      return NextResponse.json({ error: "Error al obtener tutorial" }, { status: 500 })
    }

    if (!tutorial) {
      return NextResponse.json({ error: "Tutorial no encontrado" }, { status: 404 })
    }

    const tutorialRow = tutorial as TutorialRow

    const { data: progress, error: progressError } = await supabase
      .from("user_tutorial_progress")
      .select("completed, progress_percent, completed_at")
      .eq("profile_id", userId)
      .eq("tutorial_id", tutorialRow.id)
      .maybeSingle()

    if (progressError) {
      console.error("GET /api/client/tutorials/[machineId] progress query error:", progressError)
      return NextResponse.json({ error: "Error al obtener progreso de tutorial" }, { status: 500 })
    }

    const progressRow = (progress ?? null) as TutorialProgressRow | null
    const progressPercent = Number(progressRow?.progress_percent ?? 0)
    const completed = Boolean(progressRow?.completed) || progressPercent >= 100

    const contentJson = parseJsonObject(tutorialRow.content)
    const safetyTips = readArrayFromContent(contentJson, ["safetyTips", "safety_tips", "safety", "tips"])
    const commonErrors = readArrayFromContent(contentJson, ["commonErrors", "common_errors", "errors"])
    const steps = parseSteps(tutorialRow.steps)

    return NextResponse.json({
      item: {
        id: tutorialRow.id,
        machineId: machineRow.id,
        machineName: machineRow.name,
        muscles: machineRow.muscle_groups ?? [],
        tutorialId: tutorialRow.id,
        title: tutorialRow.title,
        steps,
        safetyTips,
        commonErrors,
        gifUrl: tutorialRow.gif_url ?? null,
        videoUrl: tutorialRow.video_url,
        difficultyLevel: tutorialRow.difficulty_level ?? null,
        durationMinutes: tutorialRow.duration_minutes ?? null,
        completed,
        progressPercent,
        completedAt: progressRow?.completed_at ?? null,
      },
    })
  } catch (error) {
    console.error("GET /api/client/tutorials/[machineId] unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
