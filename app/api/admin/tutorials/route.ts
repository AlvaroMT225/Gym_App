import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { handleApiError, paginationParams, validateBody } from "@/lib/api-utils"
import { tutorialBodySchema } from "@/lib/validations/admin"

interface MachineRef {
  id: string
  name: string | null
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

interface TutorialDto {
  id: string
  machineId: string
  machineName: string
  title: string
  content: string | null
  videoUrl: string | null
  difficultyLevel: number | null
  durationMinutes: number | null
  steps: string[]
  orderIndex: number
  isActive: boolean
  status: "active" | "inactive"
  createdAt: string | null
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
      const parsed = JSON.parse(text)
      return parseStepsForResponse(parsed)
    } catch {
      return []
    }
  }

  return []
}

function toTutorialDto(row: TutorialRow): TutorialDto {
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

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const gymId = await getAdminGymId(sessionOrResponse.userId, supabase)
    if (!gymId) return NextResponse.json({ error: "No se pudo obtener gym del administrador" }, { status: 500 })

    const search = request.nextUrl.searchParams.get("search")?.trim() ?? ""
    const status = request.nextUrl.searchParams.get("status")
    const machineIdFilter = request.nextUrl.searchParams.get("machine_id")?.trim() ?? ""
    const { searchParams } = new URL(request.url)
    const { limit, offset } = paginationParams(searchParams)

    const { data: machinesData, error: machinesError } = await supabase
      .from("machines")
      .select("id, name")
      .eq("gym_id", gymId)
      .order("name", { ascending: true })

    if (machinesError) {
      console.error("GET /api/admin/tutorials machines error:", machinesError)
      return NextResponse.json({ error: "Error al obtener máquinas" }, { status: 500 })
    }

    const machines = (machinesData ?? []) as MachineRef[]
    const machineIds = machines.map((m) => m.id)
    const machinesDto = machines.map((m) => ({ id: m.id, name: m.name ?? "Máquina" }))

    if (machineIds.length === 0) {
      return NextResponse.json(
        { tutorials: [], machines: machinesDto, total: 0, limit, offset },
        { headers: { "X-Total-Count": "0" } }
      )
    }

    const scopedMachineIds =
      machineIdFilter.length > 0
        ? machineIds.includes(machineIdFilter)
          ? [machineIdFilter]
          : []
        : machineIds

    if (scopedMachineIds.length === 0) {
      return NextResponse.json(
        { tutorials: [], machines: machinesDto, total: 0, limit, offset },
        { headers: { "X-Total-Count": "0" } }
      )
    }

    let query = supabase
      .from("machine_tutorials")
      .select(
        "id, machine_id, title, content, video_url, difficulty_level, duration_minutes, steps, order_index, is_active, created_at, " +
          "machine:machines!machine_id(id, name)",
        { count: "exact", head: false }
      )
      .in("machine_id", scopedMachineIds)
      .order("created_at", { ascending: false })

    if (status === "active") query = query.eq("is_active", true)
    if (status === "inactive") query = query.eq("is_active", false)
    if (search.length > 0) query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)

    const { data, count, error } = await query.range(offset, offset + limit - 1)
    if (error) {
      console.error("GET /api/admin/tutorials query error:", error)
      return NextResponse.json({ error: "Error al obtener tutoriales" }, { status: 500 })
    }

    const tutorials = ((data ?? []) as unknown as TutorialRow[]).map(toTutorialDto)
    return NextResponse.json(
      { tutorials, machines: machinesDto, total: count ?? 0, limit, offset },
      { headers: { "X-Total-Count": String(count ?? 0) } }
    )
  } catch (err) {
    console.error("GET /api/admin/tutorials unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const body = await validateBody(request, tutorialBodySchema)

    const supabase = await createClient()
    const gymId = await getAdminGymId(sessionOrResponse.userId, supabase)
    if (!gymId) return NextResponse.json({ error: "No se pudo obtener gym del administrador" }, { status: 500 })

    const machineId = typeof body.machineId === "string" ? body.machineId.trim() : ""
    const title = typeof body.title === "string" ? body.title.trim() : ""
    if (!machineId) return NextResponse.json({ error: "machineId es requerido" }, { status: 400 })
    if (!title) return NextResponse.json({ error: "title es requerido" }, { status: 400 })

    const { data: machine, error: machineError } = await supabase
      .from("machines")
      .select("id, name")
      .eq("id", machineId)
      .eq("gym_id", gymId)
      .maybeSingle()

    if (machineError) {
      console.error("POST /api/admin/tutorials machine lookup error:", machineError)
      return NextResponse.json({ error: "Error al verificar máquina" }, { status: 500 })
    }
    if (!machine) return NextResponse.json({ error: "Máquina no encontrada" }, { status: 404 })

    const insertPayload: Record<string, unknown> = {
      machine_id: machineId,
      title,
    }

    if (typeof body.content === "string") insertPayload.content = body.content.trim() || null
    if (typeof body.videoUrl === "string") insertPayload.video_url = body.videoUrl.trim() || null
    if (typeof body.isActive === "boolean") insertPayload.is_active = body.isActive

    if (typeof body.orderIndex === "number" && Number.isFinite(body.orderIndex)) {
      insertPayload.order_index = Math.max(0, Math.round(body.orderIndex))
    }
    if (typeof body.durationMinutes === "number" && Number.isFinite(body.durationMinutes)) {
      insertPayload.duration_minutes = Math.max(1, Math.round(body.durationMinutes))
    }
    if (typeof body.difficultyLevel === "number" && Number.isFinite(body.difficultyLevel)) {
      insertPayload.difficulty_level = Math.max(1, Math.min(5, Math.round(body.difficultyLevel)))
    }
    if (body.steps !== undefined) insertPayload.steps = parseStepsForDb(body.steps)

    const { data, error } = await supabase
      .from("machine_tutorials")
      .insert(insertPayload)
      .select(
        "id, machine_id, title, content, video_url, difficulty_level, duration_minutes, steps, order_index, is_active, created_at, " +
          "machine:machines!machine_id(id, name)"
      )
      .maybeSingle()

    if (error || !data) {
      console.error("POST /api/admin/tutorials insert error:", error)
      return NextResponse.json({ error: "Error al crear tutorial" }, { status: 500 })
    }

    return NextResponse.json({ tutorial: toTutorialDto(data as unknown as TutorialRow) }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
