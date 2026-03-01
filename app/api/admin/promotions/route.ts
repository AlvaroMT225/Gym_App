import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { handleApiError, paginationParams, validateBody } from "@/lib/api-utils"
import { promotionBodySchema } from "@/lib/validations/admin"

/* ---------- label maps ---------- */

export const STATUS_LABELS: Record<string, string> = {
  active:   "Activa",
  inactive: "Inactiva",
  expired:  "Expirada",
}

export const DISCOUNT_TYPE_LABELS: Record<string, string> = {
  percentage: "Porcentaje",
  fixed:      "Monto fijo",
}

export const PLAN_LABELS: Record<string, string> = {
  basic:   "Básico",
  premium: "Premium",
  vip:     "VIP",
  custom:  "Personalizado",
}

/* ---------- types ---------- */

interface PromoRow {
  id: string
  title: string
  description: string | null
  discount_type: string | null
  discount_value: number
  code: string | null
  status: string
  starts_at: string | null
  expires_at: string | null
  max_uses: number | null
  uses_count: number
  min_plan_type: string | null
  created_at: string
}

interface PromoKpiRow {
  status: string
  uses_count: number
}

function mapPromo(p: PromoRow) {
  return {
    id: p.id,
    title: p.title,
    description: p.description ?? null,
    discountType: p.discount_type ?? "percentage",
    discountTypeLabel: DISCOUNT_TYPE_LABELS[p.discount_type ?? "percentage"] ?? (p.discount_type ?? ""),
    discountValue: Number(p.discount_value),
    code: p.code ?? null,
    status: p.status,
    statusLabel: STATUS_LABELS[p.status] ?? p.status,
    startsAt: p.starts_at ?? null,
    expiresAt: p.expires_at ?? null,
    maxUses: p.max_uses ?? null,
    usesCount: p.uses_count ?? 0,
    minPlanType: p.min_plan_type ?? null,
    minPlanLabel: p.min_plan_type ? (PLAN_LABELS[p.min_plan_type] ?? p.min_plan_type) : null,
    createdAt: p.created_at,
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
      console.error("GET /api/admin/promotions profile error:", profileError)
      return NextResponse.json({ error: "No se pudo obtener el gym del administrador" }, { status: 500 })
    }

    const gymId = adminProfile.gym_id
    const { searchParams } = new URL(request.url)
    const { limit, offset } = paginationParams(searchParams)

    const { data: rawData, count, error } = await supabase
      .from("promotions")
      .select(
        "id, title, description, discount_type, discount_value, code, status, " +
          "starts_at, expires_at, max_uses, uses_count, min_plan_type, created_at",
        { count: "exact", head: false }
      )
      .eq("gym_id", gymId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("GET /api/admin/promotions query error:", error)
      return NextResponse.json({ error: "Error al obtener promociones" }, { status: 500 })
    }

    const { data: rawKpiData, error: kpiError } = await supabase
      .from("promotions")
      .select("status, uses_count")
      .eq("gym_id", gymId)

    if (kpiError) {
      console.error("GET /api/admin/promotions KPI query error:", kpiError)
      return NextResponse.json({ error: "Error al obtener promociones" }, { status: 500 })
    }

    const data = rawData as unknown as PromoRow[] | null
    const kpiData = (rawKpiData ?? []) as PromoKpiRow[]
    const promotions = (data ?? []).map(mapPromo)

    const kpis = {
      total:             kpiData.length,
      activas:           kpiData.filter((p) => p.status === "active").length,
      expiradas:         kpiData.filter((p) => p.status === "expired").length,
      totalRedenciones:  kpiData.reduce((sum, p) => sum + (p.uses_count ?? 0), 0),
    }

    return NextResponse.json(
      { kpis, promotions, total: count ?? 0, limit, offset },
      { headers: { "X-Total-Count": String(count ?? 0) } }
    )
  } catch (err) {
    console.error("GET /api/admin/promotions unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

/* ---------- POST ---------- */

export async function POST(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const adminId = sessionOrResponse.userId

  try {
    const { title, description, discountType, discountValue, code, startsAt, expiresAt, maxUses, minPlanType, status } =
      await validateBody(request, promotionBodySchema)

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

    // Auto-generate code if not provided
    const finalCode = code?.trim()
      || title.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12)

    const { data: rawData, error } = await supabase
      .from("promotions")
      .insert({
        gym_id:         gymId,
        title:          title.trim(),
        description:    description?.trim() || null,
        discount_type:  discountType ?? "percentage",
        discount_value: Number(discountValue),
        code:           finalCode,
        status:         status ?? "active",
        starts_at:      startsAt || null,
        expires_at:     expiresAt || null,
        max_uses:       maxUses ?? null,
        min_plan_type:  minPlanType || null,
        created_by:     adminId,
      })
      .select(
        "id, title, description, discount_type, discount_value, code, status, " +
        "starts_at, expires_at, max_uses, uses_count, min_plan_type, created_at"
      )
      .maybeSingle()

    if (error || !rawData) {
      console.error("POST /api/admin/promotions insert error:", error)
      return NextResponse.json({ error: "Error al crear la promoción" }, { status: 500 })
    }

    return NextResponse.json(
      { promotion: mapPromo(rawData as unknown as PromoRow) },
      { status: 201 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}
