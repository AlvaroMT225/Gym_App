import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { STATUS_LABELS, EQUIPMENT_LABELS, MUSCLE_LABELS } from "../route"
import { handleApiError, validateBody } from "@/lib/api-utils"
import { machineUpdateBodySchema } from "@/lib/validations/admin"

/* ---------- helpers ---------- */

interface MachineRow {
  id: string
  name: string
  description: string | null
  status: string
  equipment_type: string | null
  muscle_groups: string[] | null
  location: string | null
  manufacturer: string | null
  model: string | null
  purchase_date: string | null
  last_maintenance: string | null
  image_url: string | null
  created_at: string
  qr_codes: unknown
  exercises: unknown
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

/* ---------- GET ---------- */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ machineId: string }> }
) {
  const { machineId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const gymId = await getAdminGymId(sessionOrResponse.userId, supabase)
    if (!gymId) return NextResponse.json({ error: "No se pudo obtener gym del administrador" }, { status: 500 })

    const [
      { data: rawMachine, error: machineError },
      { data: rawUsage, error: usageError },
    ] = await Promise.all([
      supabase
        .from("machines")
        .select("*, qr_codes!machine_id(*), exercises!machine_id(id, name)")
        .eq("id", machineId)
        .eq("gym_id", gymId)
        .maybeSingle(),

      supabase
        .from("session_machines")
        .select("accessed_at")
        .eq("machine_id", machineId)
        .order("accessed_at", { ascending: false }),
    ])

    if (machineError) {
      console.error("GET /api/admin/machines/[id] error:", machineError)
      return NextResponse.json({ error: "Error al obtener la máquina" }, { status: 500 })
    }
    if (!rawMachine) {
      return NextResponse.json({ error: "Máquina no encontrada" }, { status: 404 })
    }
    if (usageError) {
      console.error("GET /api/admin/machines/[id] usage error:", usageError)
    }

    const m = rawMachine as unknown as MachineRow

    const qrRaw = m.qr_codes
    let qrCode: {
      id: string; code: string; scansCount: number; isActive: boolean
      lastScannedAt: string | null; qrImageUrl: string | null
    } | null = null
    if (qrRaw) {
      const qr = (Array.isArray(qrRaw) ? qrRaw[0] : qrRaw) as {
        id: string; code: string; scans_count: number; is_active: boolean
        last_scanned_at: string | null; qr_image_url?: string | null
      } | undefined
      if (qr) {
        qrCode = {
          id: qr.id,
          code: qr.code,
          scansCount: qr.scans_count,
          isActive: qr.is_active,
          lastScannedAt: qr.last_scanned_at,
          qrImageUrl: qr.qr_image_url ?? null,
        }
      }
    }

    const exercises = Array.isArray(m.exercises)
      ? (m.exercises as { id: string; name: string }[]).map((ex) => ({ id: ex.id, name: ex.name }))
      : []

    const usageRows = rawUsage as unknown as { accessed_at: string }[] | null
    const usageStats = {
      totalUses: usageRows?.length ?? 0,
      lastUsedAt: usageRows?.[0]?.accessed_at ?? null,
    }

    return NextResponse.json({
      machine: {
        id: m.id,
        name: m.name,
        description: m.description,
        status: m.status,
        statusLabel: STATUS_LABELS[m.status] ?? m.status,
        equipmentType: m.equipment_type ?? "machine",
        equipmentLabel: EQUIPMENT_LABELS[m.equipment_type ?? "machine"] ?? (m.equipment_type ?? ""),
        muscleGroups: (m.muscle_groups ?? []).map((g) => ({ value: g, label: MUSCLE_LABELS[g] ?? g })),
        location: m.location,
        manufacturer: m.manufacturer,
        model: m.model,
        purchaseDate: m.purchase_date,
        lastMaintenance: m.last_maintenance,
        imageUrl: m.image_url,
        qrCode,
        exercises,
        createdAt: m.created_at,
      },
      usageStats,
    })
  } catch (err) {
    console.error("GET /api/admin/machines/[id] unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

/* ---------- PUT ---------- */

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ machineId: string }> }
) {
  const { machineId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const gymId = await getAdminGymId(sessionOrResponse.userId, supabase)
    if (!gymId) return NextResponse.json({ error: "No se pudo obtener gym del administrador" }, { status: 500 })

    const { name, description, status, equipmentType, muscleGroups, location, manufacturer, model } = await validateBody(request, machineUpdateBodySchema)

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updates.name = name.trim()
    if (description !== undefined) updates.description = description.trim() || null
    if (status !== undefined) updates.status = status
    if (equipmentType !== undefined) updates.equipment_type = equipmentType
    if (muscleGroups !== undefined) updates.muscle_groups = muscleGroups
    if (location !== undefined) updates.location = location.trim() || null
    if (manufacturer !== undefined) updates.manufacturer = manufacturer.trim() || null
    if (model !== undefined) updates.model = model.trim() || null

    const { data: rawData, error } = await supabase
      .from("machines")
      .update(updates)
      .eq("id", machineId)
      .eq("gym_id", gymId)
      .select("id, name, description, status, equipment_type, muscle_groups, location, manufacturer, model, updated_at")
      .maybeSingle()

    if (error) {
      console.error("PUT /api/admin/machines/[id] error:", error)
      return NextResponse.json({ error: "Error al actualizar la máquina" }, { status: 500 })
    }
    if (!rawData) {
      return NextResponse.json({ error: "Máquina no encontrada" }, { status: 404 })
    }

    const m = rawData as unknown as {
      id: string; name: string; description: string | null; status: string
      equipment_type: string; muscle_groups: string[] | null
      location: string | null; manufacturer: string | null; model: string | null
    }

    return NextResponse.json({
      machine: {
        id: m.id,
        name: m.name,
        description: m.description,
        status: m.status,
        statusLabel: STATUS_LABELS[m.status] ?? m.status,
        equipmentType: m.equipment_type,
        equipmentLabel: EQUIPMENT_LABELS[m.equipment_type] ?? m.equipment_type,
        muscleGroups: (m.muscle_groups ?? []).map((g) => ({ value: g, label: MUSCLE_LABELS[g] ?? g })),
        location: m.location,
        manufacturer: m.manufacturer,
        model: m.model,
      },
    })
  } catch (err) {
    console.error("PUT /api/admin/machines/[id] unexpected error:", err)
    return handleApiError(err)
  }
}

/* ---------- DELETE ---------- */

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ machineId: string }> }
) {
  const { machineId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const gymId = await getAdminGymId(sessionOrResponse.userId, supabase)
    if (!gymId) return NextResponse.json({ error: "No se pudo obtener gym del administrador" }, { status: 500 })

    // Delete QR codes first (FK constraint)
    const { error: qrError } = await supabase
      .from("qr_codes")
      .delete()
      .eq("machine_id", machineId)

    if (qrError) {
      console.error("DELETE /api/admin/machines/[id] qr delete error:", qrError)
      return NextResponse.json({ error: "Error al eliminar códigos QR" }, { status: 500 })
    }

    // Delete machine
    const { error: machineError } = await supabase
      .from("machines")
      .delete()
      .eq("id", machineId)
      .eq("gym_id", gymId)

    if (machineError) {
      console.error("DELETE /api/admin/machines/[id] machine delete error:", machineError)
      return NextResponse.json({ error: "Error al eliminar la máquina" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("DELETE /api/admin/machines/[id] unexpected error:", err)
    return handleApiError(err)
  }
}
