import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { handleApiError, validateBody } from "@/lib/api-utils"
import { settingsUpdateBodySchema } from "@/lib/validations/admin"

interface GymRow {
  id: string
  name: string | null
  address: string | null
  city: string | null
  country: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
  timezone: string | null
  settings: unknown
}

interface ScheduleRow {
  id: string
  day_of_week: number
  opens_at: string | null
  closes_at: string | null
  is_closed: boolean | null
}

async function getAdminGymId(
  adminId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
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
    if (!gymId) {
      return NextResponse.json({ error: "No se pudo obtener gym del administrador" }, { status: 500 })
    }

    const [gymResult, schedulesResult] = await Promise.all([
      supabase
        .from("gyms")
        .select("id, name, address, city, country, phone, email, logo_url, timezone, settings")
        .eq("id", gymId)
        .single(),
      supabase
        .from("gym_schedules")
        .select("id, day_of_week, opens_at, closes_at, is_closed")
        .eq("gym_id", gymId)
        .order("day_of_week"),
    ])

    if (gymResult.error || !gymResult.data) {
      console.error("GET /api/admin/settings gym error:", gymResult.error)
      return NextResponse.json({ error: "Error al obtener datos del gym" }, { status: 500 })
    }

    const gymRow = gymResult.data as unknown as GymRow
    const scheduleRows = (schedulesResult.data ?? []) as unknown as ScheduleRow[]

    const gym = {
      id: gymRow.id,
      name: gymRow.name ?? "",
      address: gymRow.address ?? "",
      city: gymRow.city ?? "",
      country: gymRow.country ?? "",
      phone: gymRow.phone ?? "",
      email: gymRow.email ?? "",
      logoUrl: gymRow.logo_url ?? null,
      timezone: gymRow.timezone ?? "America/Guayaquil",
      settings: gymRow.settings ?? {},
    }

    const schedules = scheduleRows.map((s) => ({
      id: s.id,
      dayOfWeek: s.day_of_week,
      opensAt: s.opens_at ?? "06:00",
      closesAt: s.closes_at ?? "22:00",
      isClosed: s.is_closed ?? false,
    }))

    return NextResponse.json({ gym, schedules })
  } catch (err) {
    console.error("GET /api/admin/settings unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const gymId = await getAdminGymId(sessionOrResponse.userId, supabase)
    if (!gymId) {
      return NextResponse.json({ error: "No se pudo obtener gym del administrador" }, { status: 500 })
    }

    const body = await validateBody(request, settingsUpdateBodySchema)

    if (typeof body.section !== "string" || !body.data || typeof body.data !== "object") {
      return NextResponse.json({ error: "Body inválido" }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // --- Section A: info ---
    if (body.section === "info") {
      const data = body.data as {
        name?: unknown
        address?: unknown
        city?: unknown
        phone?: unknown
        email?: unknown
        timezone?: unknown
      }

      if (typeof data.name !== "string" || !data.name.trim()) {
        return NextResponse.json({ error: "El nombre del gimnasio es requerido" }, { status: 400 })
      }

      const updates: Record<string, unknown> = {
        name: data.name.trim(),
      }
      if (typeof data.address === "string") updates.address = data.address.trim() || null
      if (typeof data.city === "string") updates.city = data.city.trim() || null
      if (typeof data.phone === "string") updates.phone = data.phone.trim() || null
      if (typeof data.email === "string") updates.email = data.email.trim() || null
      if (typeof data.timezone === "string") updates.timezone = data.timezone.trim() || "America/Guayaquil"

      const { error } = await adminSupabase
        .from("gyms")
        .update(updates)
        .eq("id", gymId)

      if (error) {
        console.error("PUT /api/admin/settings info error:", error)
        return NextResponse.json({ error: "Error al actualizar información del gym" }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    // --- Section B: schedules ---
    if (body.section === "schedules") {
      const data = body.data as {
        schedules?: unknown
      }

      if (!Array.isArray(data.schedules)) {
        return NextResponse.json({ error: "Formato de horarios inválido" }, { status: 400 })
      }

      for (const item of data.schedules as Record<string, unknown>[]) {
        const dayOfWeek = typeof item.dayOfWeek === "number" ? item.dayOfWeek : null
        if (dayOfWeek === null || dayOfWeek < 0 || dayOfWeek > 6) continue

        const isClosed = typeof item.isClosed === "boolean" ? item.isClosed : false
        const opensAt = typeof item.opensAt === "string" && item.opensAt ? item.opensAt : null
        const closesAt = typeof item.closesAt === "string" && item.closesAt ? item.closesAt : null

        const { error } = await adminSupabase
          .from("gym_schedules")
          .update({
            opens_at: isClosed ? null : opensAt,
            closes_at: isClosed ? null : closesAt,
            is_closed: isClosed,
          })
          .eq("gym_id", gymId)
          .eq("day_of_week", dayOfWeek)

        if (error) {
          console.error(`PUT /api/admin/settings schedules day ${dayOfWeek} error:`, error)
          return NextResponse.json({ error: "Error al actualizar horarios" }, { status: 500 })
        }
      }

      return NextResponse.json({ success: true })
    }

    // --- Section C: settings (JSONB) ---
    if (body.section === "settings") {
      const data = body.data as { settings?: unknown }

      if (!data.settings || typeof data.settings !== "object" || Array.isArray(data.settings)) {
        return NextResponse.json({ error: "Formato de settings inválido" }, { status: 400 })
      }

      const { error } = await adminSupabase
        .from("gyms")
        .update({ settings: data.settings })
        .eq("id", gymId)

      if (error) {
        console.error("PUT /api/admin/settings settings error:", error)
        return NextResponse.json({ error: "Error al actualizar settings" }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: `Sección desconocida: ${(body as any).section}` }, { status: 400 })
  } catch (error) {
    return handleApiError(error)
  }
}
