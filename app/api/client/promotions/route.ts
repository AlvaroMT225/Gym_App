import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { paginationParams } from "@/lib/api-utils"

// Reuse the same time-window filter pattern from /api/promotions/active
function buildWindowFilter(nowIso: string): string {
  return (
    `or(and(starts_at.is.null,expires_at.is.null),` +
    `and(starts_at.is.null,expires_at.gte.${nowIso}),` +
    `and(starts_at.lte.${nowIso},expires_at.is.null),` +
    `and(starts_at.lte.${nowIso},expires_at.gte.${nowIso}))`
  )
}

interface PromotionRow {
  id: string
  title: string
  description: string | null
  code: string | null
  discount_type: string | null
  discount_value: number
  starts_at: string | null
  expires_at: string | null
  max_uses: number | null
  uses_count: number
  status: string
}

interface UserPromotionRow {
  promotion_id: string
  used_at: string
}

export interface PromotionDto {
  id: string
  title: string
  description: string | null
  code: string | null
  discountType: string | null
  discountValue: number
  startsAt: string | null
  expiresAt: string | null
  maxUses: number | null
  usesCount: number
  status: string
  redeemed: boolean
  redeemedAt: string | null
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const userId = sessionOrResponse.userId
    const { searchParams } = new URL(request.url)
    const { limit, offset } = paginationParams(searchParams)

    // Get user's gym_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", userId)
      .maybeSingle()

    if (profileError) {
      console.error("GET /api/client/promotions profile error:", profileError)
      return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 })
    }

    if (!profile?.gym_id) {
      return NextResponse.json(
        { promotions: [], total: 0, limit, offset },
        { headers: { "X-Total-Count": "0" } }
      )
    }

    const nowIso = new Date().toISOString()

    // Step 1: active promotions in the valid time window for this gym
    const { data: promotionsData, count, error: promotionsError } = await supabase
      .from("promotions")
      .select(
        "id, title, description, code, discount_type, discount_value, starts_at, expires_at, max_uses, uses_count, status",
        { count: "exact", head: false }
      )
      .eq("gym_id", profile.gym_id)
      .eq("status", "active")
      .or(buildWindowFilter(nowIso))
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (promotionsError) {
      console.error("GET /api/client/promotions promotions error:", promotionsError)
      return NextResponse.json({ error: "Error al obtener promociones" }, { status: 500 })
    }

    const rows = (promotionsData ?? []) as PromotionRow[]

    // Step 2: user's redemptions for these promos
    const promotionIds = rows.map((p) => p.id)
    let redeemedMap = new Map<string, string>()

    if (promotionIds.length > 0) {
      const { data: userPromos, error: userPromosError } = await supabase
        .from("user_promotions")
        .select("promotion_id, used_at")
        .eq("profile_id", userId)
        .in("promotion_id", promotionIds)

      if (userPromosError) {
        console.error("GET /api/client/promotions user_promotions error:", userPromosError)
        // Non-fatal: continue without redemption info
      } else {
        redeemedMap = new Map(
          ((userPromos ?? []) as UserPromotionRow[]).map((up) => [up.promotion_id, up.used_at])
        )
      }
    }

    // Step 3: build DTOs — filter out exhausted promos
    const promotions: PromotionDto[] = rows
      .filter((p) => p.max_uses == null || p.uses_count < p.max_uses || redeemedMap.has(p.id))
      .map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        code: p.code,
        discountType: p.discount_type,
        discountValue: Number(p.discount_value),
        startsAt: p.starts_at,
        expiresAt: p.expires_at,
        maxUses: p.max_uses,
        usesCount: p.uses_count,
        status: p.status,
        redeemed: redeemedMap.has(p.id),
        redeemedAt: redeemedMap.get(p.id) ?? null,
      }))

    return NextResponse.json(
      { promotions, total: count ?? 0, limit, offset },
      { headers: { "X-Total-Count": String(count ?? 0) } }
    )
  } catch (error) {
    console.error("GET /api/client/promotions unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
