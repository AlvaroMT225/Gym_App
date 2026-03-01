import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { handleApiError, validateBody } from "@/lib/api-utils"
import { tutorialProgressBodySchema } from "@/lib/validations/athlete"

interface TutorialProgressRow {
  tutorial_id: string
  completed: boolean | null
  progress_percent: number | null
  completed_at: string | null
  tutorial: { machine_id: string } | { machine_id: string }[] | null
}

interface ExistingProgressRow {
  completed: boolean | null
  completed_at: string | null
}

interface UpsertProgressRow {
  tutorial_id: string
  completed: boolean | null
  progress_percent: number | null
  completed_at: string | null
}

interface TutorialRow {
  id: string
  machine_id: string
}

function normalizeTutorial(value: TutorialProgressRow["tutorial"]): { machine_id: string } | null {
  if (!value) return null
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

function normalizeProgressPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const userId = sessionOrResponse.userId

    const { data, error } = await supabase
      .from("user_tutorial_progress")
      .select(`
        tutorial_id,
        completed,
        progress_percent,
        completed_at,
        tutorial:machine_tutorials(
          machine_id
        )
      `)
      .eq("profile_id", userId)

    if (error) {
      console.error("GET /api/client/tutorials/progress query error:", error)
      return NextResponse.json({ error: "Error al obtener progreso de tutoriales" }, { status: 500 })
    }

    const items = ((data ?? []) as TutorialProgressRow[]).map((row) => {
      const tutorial = normalizeTutorial(row.tutorial)
      const progressPercent = Number(row.progress_percent ?? 0)
      return {
        tutorialId: row.tutorial_id,
        machineId: tutorial?.machine_id ?? null,
        completed: Boolean(row.completed) || progressPercent >= 100,
        progressPercent,
        completedAt: row.completed_at,
      }
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error("GET /api/client/tutorials/progress unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const userId = sessionOrResponse.userId

    const { tutorialId, progressPercent: rawProgressPercent } = await validateBody(request, tutorialProgressBodySchema)

    const progressPercent = normalizeProgressPercent(rawProgressPercent)
    const completed = progressPercent >= 100

    const { data: tutorial, error: tutorialError } = await supabase
      .from("machine_tutorials")
      .select("id, machine_id")
      .eq("id", tutorialId)
      .eq("is_active", true)
      .maybeSingle()

    if (tutorialError) {
      console.error("POST /api/client/tutorials/progress tutorial query error:", tutorialError)
      return NextResponse.json({ error: "Error al verificar tutorial" }, { status: 500 })
    }

    if (!tutorial) {
      return NextResponse.json({ error: "Tutorial no encontrado" }, { status: 404 })
    }

    const tutorialRow = tutorial as TutorialRow

    const { data: existing, error: existingError } = await supabase
      .from("user_tutorial_progress")
      .select("completed, completed_at")
      .eq("profile_id", userId)
      .eq("tutorial_id", tutorialId)
      .maybeSingle()

    if (existingError) {
      console.error("POST /api/client/tutorials/progress existing query error:", existingError)
      return NextResponse.json({ error: "Error al verificar progreso actual" }, { status: 500 })
    }

    const existingRow = (existing ?? null) as ExistingProgressRow | null
    const completedAt = completed
      ? existingRow?.completed && existingRow.completed_at
        ? existingRow.completed_at
        : new Date().toISOString()
      : null

    const { data: upserted, error: upsertError } = await supabase
      .from("user_tutorial_progress")
      .upsert(
        {
          profile_id: userId,
          tutorial_id: tutorialId,
          completed,
          progress_percent: progressPercent,
          completed_at: completedAt,
        },
        { onConflict: "profile_id,tutorial_id" }
      )
      .select("tutorial_id, completed, progress_percent, completed_at")
      .single()

    if (upsertError) {
      console.error("POST /api/client/tutorials/progress upsert error:", upsertError)
      return NextResponse.json({ error: "Error al actualizar progreso" }, { status: 500 })
    }

    const row = upserted as UpsertProgressRow

    return NextResponse.json({
      item: {
        tutorialId: row.tutorial_id,
        machineId: tutorialRow.machine_id,
        completed: Boolean(row.completed),
        progressPercent: Number(row.progress_percent ?? 0),
        completedAt: row.completed_at,
      },
    })
  } catch (error) {
    console.error("POST /api/client/tutorials/progress unexpected error:", error)
    return handleApiError(error)
  }
}
