import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { handleApiError, validateBody } from "@/lib/api-utils"
import { tutorialUpdateBodySchema } from "@/lib/validations/admin"

interface MachineRef {
  id: string
  name: string | null
  gym_id?: string | null
}

interface TutorialRow {
  id: string
  machine_id: string
  title: string
  content: string | null
  video_url: string | null
  difficulty_level: number | null
  duration_minutes: number | null
  steps: unknown
  order_index: number | null
  is_active: boolean | null
  created_at: string | null
  machine: unknown
}

function normalizeEmbed<T>(raw: unknown): T | null {
  if (!raw) return null
  if (Array.isArray(raw)) return (raw[0] as T) ?? null
  return raw as T
}

function parseStepsForDb(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0)
  }
  if (typeof raw === "string") {
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  }
  return []
}

function parseStepsForResponse(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
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

  if (typeof raw === "string") {
    const text = raw.trim()
    if (!text) return []
    try {
      return parseStepsForResponse(JSON.parse(text))
    } catch {
      return []
    }
  }

  return []
}

function toTutorialDto(row: TutorialRow) {
  const machine = normalizeEmbed<MachineRef>(row.machine)
  const isActive = row.is_active !== false
  return {
    id: row.id,
    machineId: row.machine_id,
    machineName: machine?.name ?? "Máquina",
    title: row.title,
    content: row.content ?? null,
    videoUrl: row.video_url ?? null,
    difficultyLevel: row.difficulty_level ?? null,
    durationMinutes: row.duration_minutes ?? null,
    steps: parseStepsForResponse(row.steps),
    orderIndex: row.order_index ?? 0,
    isActive,
    status: isActive ? "active" : "inactive",
    createdAt: row.created_at ?? null,
  }
}

async function getAdminGymId(adminId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase
    .from("profiles")
    .select("gym_id")
    .eq("id", adminId)
    .maybeSingle()

  if (error || !data?.gym_id) return null
  return data.gym_id as string
}

async function getTutorialScopedToGym(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tutorialId: string,
  gymId: string
) {
  const { data, error } = await supabase
    .from("machine_tutorials")
    .select(
      "id, machine_id, title, content, video_url, difficulty_level, duration_minutes, steps, order_index, is_active, created_at, " +
        "machine:machines!machine_id(id, name, gym_id)"
    )
    .eq("id", tutorialId)
    .maybeSingle()

  if (error || !data) return null
  const row = data as unknown as TutorialRow
  const machine = normalizeEmbed<MachineRef>(row.machine)
  if (!machine?.gym_id || machine.gym_id !== gymId) return null
  return row
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tutorialId: string }> }
) {
  const { tutorialId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const gymId = await getAdminGymId(sessionOrResponse.userId, supabase)
    if (!gymId) return NextResponse.json({ error: "No se pudo obtener gym del administrador" }, { status: 500 })

    const row = await getTutorialScopedToGym(supabase, tutorialId, gymId)
    if (!row) return NextResponse.json({ error: "Tutorial no encontrado" }, { status: 404 })

    return NextResponse.json({ tutorial: toTutorialDto(row) })
  } catch (err) {
    console.error("GET /api/admin/tutorials/[id] unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tutorialId: string }> }
) {
  const { tutorialId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const gymId = await getAdminGymId(sessionOrResponse.userId, supabase)
    if (!gymId) return NextResponse.json({ error: "No se pudo obtener gym del administrador" }, { status: 500 })

    const existing = await getTutorialScopedToGym(supabase, tutorialId, gymId)
    if (!existing) return NextResponse.json({ error: "Tutorial no encontrado" }, { status: 404 })

    const body = await validateBody(request, tutorialUpdateBodySchema)

    const updates: Record<string, unknown> = {}

    if (typeof body.machineId === "string") {
      const machineId = body.machineId.trim()
      if (!machineId) {
        return NextResponse.json({ error: "machineId inválido" }, { status: 400 })
      }
      const { data: machine, error: machineError } = await supabase
        .from("machines")
        .select("id")
        .eq("id", machineId)
        .eq("gym_id", gymId)
        .maybeSingle()

      if (machineError) {
        console.error("PUT /api/admin/tutorials/[id] machine lookup error:", machineError)
        return NextResponse.json({ error: "Error al verificar máquina" }, { status: 500 })
      }
      if (!machine) {
        return NextResponse.json({ error: "Máquina no encontrada" }, { status: 404 })
      }

      updates.machine_id = machineId
    }

    if (typeof body.title === "string") updates.title = body.title.trim()
    if (typeof body.content === "string") updates.content = body.content.trim() || null
    if (typeof body.videoUrl === "string") updates.video_url = body.videoUrl.trim() || null
    if (typeof body.isActive === "boolean") updates.is_active = body.isActive

    if (typeof body.orderIndex === "number" && Number.isFinite(body.orderIndex)) {
      updates.order_index = Math.max(0, Math.round(body.orderIndex))
    }
    if (typeof body.durationMinutes === "number" && Number.isFinite(body.durationMinutes)) {
      updates.duration_minutes = Math.max(1, Math.round(body.durationMinutes))
    }
    if (typeof body.difficultyLevel === "number" && Number.isFinite(body.difficultyLevel)) {
      updates.difficulty_level = Math.max(1, Math.min(5, Math.round(body.difficultyLevel)))
    }
    if (body.steps !== undefined) updates.steps = parseStepsForDb(body.steps)

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ tutorial: toTutorialDto(existing) })
    }

    const { data, error } = await supabase
      .from("machine_tutorials")
      .update(updates)
      .eq("id", tutorialId)
      .select(
        "id, machine_id, title, content, video_url, difficulty_level, duration_minutes, steps, order_index, is_active, created_at, " +
          "machine:machines!machine_id(id, name)"
      )
      .maybeSingle()

    if (error || !data) {
      console.error("PUT /api/admin/tutorials/[id] update error:", error)
      return NextResponse.json({ error: "Error al actualizar tutorial" }, { status: 500 })
    }

    return NextResponse.json({ tutorial: toTutorialDto(data as unknown as TutorialRow) })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tutorialId: string }> }
) {
  const { tutorialId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const gymId = await getAdminGymId(sessionOrResponse.userId, supabase)
    if (!gymId) return NextResponse.json({ error: "No se pudo obtener gym del administrador" }, { status: 500 })

    const existing = await getTutorialScopedToGym(supabase, tutorialId, gymId)
    if (!existing) return NextResponse.json({ error: "Tutorial no encontrado" }, { status: 404 })

    const adminSupabase = createAdminClient()

    // Delete child records first to satisfy FK constraint
    const { error: progressError } = await adminSupabase
      .from("user_tutorial_progress")
      .delete()
      .eq("tutorial_id", tutorialId)
    if (progressError) {
      console.error("DELETE /api/admin/tutorials/[id] progress delete error:", progressError)
      return NextResponse.json({ error: "Error al eliminar progreso de usuarios" }, { status: 500 })
    }

    const { error } = await adminSupabase.from("machine_tutorials").delete().eq("id", tutorialId)
    if (error) {
      console.error("DELETE /api/admin/tutorials/[id] delete error:", error)
      return NextResponse.json({ error: "Error al eliminar tutorial" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
