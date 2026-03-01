import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { STATUS_LABELS, DISCOUNT_TYPE_LABELS, PLAN_LABELS } from "../route"
import { handleApiError, validateBody } from "@/lib/api-utils"
import { promotionUpdateBodySchema } from "@/lib/validations/admin"

/* ---------- helpers ---------- */

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
  { params }: { params: Promise<{ promoId: string }> }
) {
  const { promoId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const gymId = await getAdminGymId(sessionOrResponse.userId, supabase)
    if (!gymId) return NextResponse.json({ error: "No se pudo obtener gym del administrador" }, { status: 500 })

    const [
      { data: rawPromo, error: promoError },
      { data: rawRedemptions, error: redemptionsError },
    ] = await Promise.all([
      supabase
        .from("promotions")
        .select(
          "id, title, description, discount_type, discount_value, code, status, " +
          "starts_at, expires_at, max_uses, uses_count, min_plan_type, created_at"
        )
        .eq("id", promoId)
        .eq("gym_id", gymId)
        .maybeSingle(),

      supabase
        .from("user_promotions")
        .select("id, used_at, profile:profiles!profile_id(first_name, last_name)")
        .eq("promotion_id", promoId)
        .order("used_at", { ascending: false }),
    ])

    if (promoError) {
      console.error("GET /api/admin/promotions/[id] promo error:", promoError)
      return NextResponse.json({ error: "Error al obtener la promoción" }, { status: 500 })
    }
    if (!rawPromo) {
      return NextResponse.json({ error: "Promoción no encontrada" }, { status: 404 })
    }
    if (redemptionsError) {
      console.error("GET /api/admin/promotions/[id] redemptions error:", redemptionsError)
    }

    const p = rawPromo as unknown as PromoRow

    const redemptionRows = rawRedemptions as unknown as Array<{
      id: string
      used_at: string
      profile: { first_name: string | null; last_name: string | null } | Array<{ first_name: string | null; last_name: string | null }> | null
    }> | null

    const redemptions = (redemptionRows ?? []).map((r) => {
      const prof = Array.isArray(r.profile) ? r.profile[0] : r.profile
      const firstName = prof?.first_name ?? ""
      const lastName = prof?.last_name ?? ""
      return {
        id: r.id,
        memberName: `${firstName} ${lastName}`.trim() || "Miembro",
        usedAt: r.used_at,
      }
    })

    return NextResponse.json({
      promotion: {
        id: p.id,
        title: p.title,
        description: p.description,
        discountType: p.discount_type ?? "percentage",
        discountTypeLabel: DISCOUNT_TYPE_LABELS[p.discount_type ?? "percentage"] ?? "",
        discountValue: Number(p.discount_value),
        code: p.code,
        status: p.status,
        statusLabel: STATUS_LABELS[p.status] ?? p.status,
        startsAt: p.starts_at,
        expiresAt: p.expires_at,
        maxUses: p.max_uses,
        usesCount: p.uses_count ?? 0,
        minPlanType: p.min_plan_type,
        minPlanLabel: p.min_plan_type ? (PLAN_LABELS[p.min_plan_type] ?? p.min_plan_type) : null,
        createdAt: p.created_at,
      },
      redemptions,
    })
  } catch (err) {
    console.error("GET /api/admin/promotions/[id] unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

/* ---------- PUT ---------- */

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ promoId: string }> }
) {
  const { promoId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const gymId = await getAdminGymId(sessionOrResponse.userId, supabase)
    if (!gymId) return NextResponse.json({ error: "No se pudo obtener gym del administrador" }, { status: 500 })

    const body = await validateBody(request, promotionUpdateBodySchema)
    const {
      title, description, discountValue, code,
      status, startsAt, expiresAt, maxUses, minPlanType,
    } = body as {
      title?: string
      description?: string
      discountValue?: number
      code?: string
      status?: string
      startsAt?: string
      expiresAt?: string
      maxUses?: number
      minPlanType?: string
    }

    const updates: Record<string, unknown> = {}
    if (title !== undefined) updates.title = title.trim()
    if (description !== undefined) updates.description = description.trim() || null
    if (discountValue !== undefined) updates.discount_value = Number(discountValue)
    if (code !== undefined) updates.code = code.trim() || null
    if (status !== undefined) updates.status = status
    if (startsAt !== undefined) updates.starts_at = startsAt || null
    if (expiresAt !== undefined) updates.expires_at = expiresAt || null
    if (maxUses !== undefined) updates.max_uses = maxUses ?? null
    if (minPlanType !== undefined) updates.min_plan_type = minPlanType || null

    const { data: rawData, error } = await supabase
      .from("promotions")
      .update(updates)
      .eq("id", promoId)
      .eq("gym_id", gymId)
      .select(
        "id, title, description, discount_type, discount_value, code, status, " +
        "starts_at, expires_at, max_uses, uses_count, min_plan_type, created_at"
      )
      .maybeSingle()

    if (error) {
      console.error("PUT /api/admin/promotions/[id] error:", error)
      return NextResponse.json({ error: "Error al actualizar la promoción" }, { status: 500 })
    }
    if (!rawData) {
      return NextResponse.json({ error: "Promoción no encontrada" }, { status: 404 })
    }

    const p = rawData as unknown as PromoRow
    return NextResponse.json({
      promotion: {
        id: p.id,
        title: p.title,
        description: p.description,
        discountType: p.discount_type ?? "percentage",
        discountTypeLabel: DISCOUNT_TYPE_LABELS[p.discount_type ?? "percentage"] ?? "",
        discountValue: Number(p.discount_value),
        code: p.code,
        status: p.status,
        statusLabel: STATUS_LABELS[p.status] ?? p.status,
        startsAt: p.starts_at,
        expiresAt: p.expires_at,
        maxUses: p.max_uses,
        usesCount: p.uses_count ?? 0,
        minPlanType: p.min_plan_type,
        minPlanLabel: p.min_plan_type ? (PLAN_LABELS[p.min_plan_type] ?? p.min_plan_type) : null,
        createdAt: p.created_at,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/* ---------- DELETE ---------- */

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ promoId: string }> }
) {
  const { promoId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const gymId = await getAdminGymId(sessionOrResponse.userId, supabase)
    if (!gymId) return NextResponse.json({ error: "No se pudo obtener gym del administrador" }, { status: 500 })

    // Delete user_promotions first (FK constraint)
    const { error: upError } = await supabase
      .from("user_promotions")
      .delete()
      .eq("promotion_id", promoId)

    if (upError) {
      console.error("DELETE /api/admin/promotions/[id] user_promotions error:", upError)
      return NextResponse.json({ error: "Error al eliminar redenciones de la promoción" }, { status: 500 })
    }

    const { error: promoError } = await supabase
      .from("promotions")
      .delete()
      .eq("id", promoId)
      .eq("gym_id", gymId)

    if (promoError) {
      console.error("DELETE /api/admin/promotions/[id] promo error:", promoError)
      return NextResponse.json({ error: "Error al eliminar la promoción" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
