import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { handleApiError, paginationParams, validateBody } from "@/lib/api-utils"
import { machineBodySchema } from "@/lib/validations/admin"

/* ---------- label maps ---------- */

export const STATUS_LABELS: Record<string, string> = {
  available: "Disponible",
  in_use: "En uso",
  maintenance: "Mantenimiento",
  out_of_order: "Fuera de servicio",
}

export const EQUIPMENT_LABELS: Record<string, string> = {
  machine: "Máquina",
  free_weight: "Peso libre",
  cable: "Cable",
  bodyweight: "Peso corporal",
  cardio: "Cardio",
  resistance_band: "Banda elástica",
}

export const MUSCLE_LABELS: Record<string, string> = {
  chest: "Pecho",
  back: "Espalda",
  shoulders: "Hombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  arms: "Brazos",
  legs: "Piernas",
  glutes: "Glúteos",
  core: "Core",
  full_body: "Cuerpo completo",
  cardio: "Cardio",
}

/* ---------- types ---------- */

interface QrRef {
  id: string
  code: string
  scans_count: number
  is_active: boolean
  last_scanned_at: string | null
}

interface ExerciseRef {
  id: string
  name: string
}

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

interface MachineKpiRow {
  status: string
}

function buildMachineQrPayload(machineId: string): string {
  return `minthytraining://machine/${machineId}`
}

function getMachineQrDisplayCode(machineId: string, storedCode: string): string {
  const payload = buildMachineQrPayload(machineId)
  return storedCode !== payload ? storedCode : machineId
}

function mapMachine(m: MachineRow) {
  const qrRaw = m.qr_codes
  let qrCode: {
    id: string
    code: string
    payload: string
    displayCode: string
    scansCount: number
    isActive: boolean
    lastScannedAt: string | null
  } | null = null

  if (qrRaw) {
    const qr = (Array.isArray(qrRaw) ? qrRaw[0] : qrRaw) as QrRef | undefined
    if (qr) {
      const payload = buildMachineQrPayload(m.id)
      qrCode = {
        id: qr.id,
        code: qr.code,
        payload,
        displayCode: getMachineQrDisplayCode(m.id, qr.code),
        scansCount: qr.scans_count,
        isActive: qr.is_active,
        lastScannedAt: qr.last_scanned_at,
      }
    }
  }

  const exercisesRaw = m.exercises
  const exercises: { id: string; name: string }[] = Array.isArray(exercisesRaw)
    ? (exercisesRaw as ExerciseRef[]).map((ex) => ({ id: ex.id, name: ex.name }))
    : []

  const muscleGroups = (m.muscle_groups ?? []).map((g) => ({
    value: g,
    label: MUSCLE_LABELS[g] ?? g,
  }))

  return {
    id: m.id,
    name: m.name,
    description: m.description ?? null,
    status: m.status,
    statusLabel: STATUS_LABELS[m.status] ?? m.status,
    equipmentType: m.equipment_type ?? "machine",
    equipmentLabel: EQUIPMENT_LABELS[m.equipment_type ?? "machine"] ?? (m.equipment_type ?? ""),
    muscleGroups,
    location: m.location ?? null,
    manufacturer: m.manufacturer ?? null,
    model: m.model ?? null,
    purchaseDate: m.purchase_date ?? null,
    lastMaintenance: m.last_maintenance ?? null,
    imageUrl: m.image_url ?? null,
    qrCode,
    exercises,
    createdAt: m.created_at,
  }
}

/* ---------- GET ---------- */

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const adminId = sessionOrResponse.userId

  try {
    const supabase = await createClient()

    const { data: adminProfile, error: profileError } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", adminId)
      .maybeSingle()

    if (profileError || !adminProfile?.gym_id) {
      console.error("GET /api/admin/machines profile error:", profileError)
      return NextResponse.json({ error: "No se pudo obtener el gym del administrador" }, { status: 500 })
    }

    const gymId = adminProfile.gym_id
    const { searchParams } = new URL(request.url)
    const { limit, offset } = paginationParams(searchParams)

    const { data: rawData, count, error } = await supabase
      .from("machines")
      .select(
        "*, " +
          "qr_codes!machine_id(id, code, scans_count, is_active, last_scanned_at), " +
          "exercises!machine_id(id, name)",
        { count: "exact", head: false }
      )
      .eq("gym_id", gymId)
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("GET /api/admin/machines query error:", error)
      return NextResponse.json({ error: "Error al obtener máquinas" }, { status: 500 })
    }

    const { data: rawKpiData, error: kpiError } = await supabase
      .from("machines")
      .select("status")
      .eq("gym_id", gymId)

    if (kpiError) {
      console.error("GET /api/admin/machines KPI query error:", kpiError)
      return NextResponse.json({ error: "Error al obtener mÃ¡quinas" }, { status: 500 })
    }

    const data = rawData as unknown as MachineRow[] | null
    const kpiData = (rawKpiData ?? []) as MachineKpiRow[]
    const machines = (data ?? []).map(mapMachine)

    const kpis = {
      total: kpiData.length,
      available: kpiData.filter((m) => m.status === "available").length,
      maintenance: kpiData.filter((m) => m.status === "maintenance").length,
      outOfOrder: kpiData.filter((m) => m.status === "out_of_order").length,
    }

    return NextResponse.json(
      { kpis, machines, total: count ?? 0, limit, offset },
      { headers: { "X-Total-Count": String(count ?? 0) } }
    )
  } catch (err) {
    console.error("GET /api/admin/machines unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

/* ---------- POST ---------- */

export async function POST(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const adminId = sessionOrResponse.userId

  try {
    const supabase = await createClient()

    const { data: adminProfile, error: profileError } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", adminId)
      .maybeSingle()

    if (profileError || !adminProfile?.gym_id) {
      return NextResponse.json({ error: "No se pudo obtener el gym del administrador" }, { status: 500 })
    }

    const gymId = adminProfile.gym_id

    const { name, description, equipmentType, muscleGroups, location, status } = await validateBody(
      request,
      machineBodySchema
    )

    const { data: rawMachine, error: machineError } = await supabase
      .from("machines")
      .insert({
        gym_id: gymId,
        name: name.trim(),
        description: description?.trim() || null,
        equipment_type: equipmentType,
        muscle_groups: muscleGroups ?? [],
        location: location?.trim() || null,
        status: status ?? "available",
      })
      .select("id, name, status, equipment_type, muscle_groups, location, description, created_at")
      .maybeSingle()

    if (machineError || !rawMachine) {
      console.error("POST /api/admin/machines insert error:", machineError)
      return NextResponse.json({ error: "Error al crear la máquina" }, { status: 500 })
    }

    const md = rawMachine as unknown as {
      id: string
      name: string
      status: string
      equipment_type: string
      muscle_groups: string[]
      location: string | null
      description: string | null
      created_at: string
    }

    const qrPayload = buildMachineQrPayload(md.id)

    const { data: rawQr, error: qrError } = await supabase
      .from("qr_codes")
      .insert({ machine_id: md.id, code: qrPayload, is_active: true })
      .select("id, code, scans_count, is_active, last_scanned_at")
      .maybeSingle()

    if (qrError) {
      console.error("POST /api/admin/machines qr insert error:", qrError)
    }

    const qd = rawQr as unknown as QrRef | null

    return NextResponse.json(
      {
        machine: {
          id: md.id,
          name: md.name,
          description: md.description,
          status: md.status,
          statusLabel: STATUS_LABELS[md.status] ?? md.status,
          equipmentType: md.equipment_type,
          equipmentLabel: EQUIPMENT_LABELS[md.equipment_type] ?? md.equipment_type,
          muscleGroups: (md.muscle_groups ?? []).map((g) => ({ value: g, label: MUSCLE_LABELS[g] ?? g })),
          location: md.location,
          qrCode: qd
            ? {
                id: qd.id,
                code: qd.code,
                payload: buildMachineQrPayload(md.id),
                displayCode: getMachineQrDisplayCode(md.id, qd.code),
                scansCount: qd.scans_count,
                isActive: qd.is_active,
                lastScannedAt: qd.last_scanned_at,
              }
            : null,
          exercises: [],
          createdAt: md.created_at,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error("POST /api/admin/machines unexpected error:", err)
    return handleApiError(err)
  }
}
