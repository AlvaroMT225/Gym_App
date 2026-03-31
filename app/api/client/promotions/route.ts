import { NextRequest, NextResponse } from "next/server"
import { paginationParams } from "@/lib/api-utils"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

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
  uses_count: number | null
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
  discount_type: string | null
  discount_value: number
  code: string | null
  expires_at: string | null
  max_uses: number | null
  uses_count: number
  is_redeemed: boolean
  redeemed_at: string | null
  starts_at: string | null
  status: string
  discountType: string | null
  discountValue: number
  startsAt: string | null
  expiresAt: string | null
  maxUses: number | null
  usesCount: number
  isRedeemed: boolean
  redeemed: boolean
  redeemedAt: string | null
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient(request)
    const userId = sessionOrResponse.userId
    const { searchParams } = new URL(request.url)
    const { limit, offset } = paginationParams(searchParams)

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

    const { data: promotionsData, error: promotionsError } = await supabase
      .from("promotions")
      .select(
        "id, title, description, code, discount_type, discount_value, starts_at, expires_at, max_uses, uses_count, status"
      )
      .eq("gym_id", profile.gym_id)
      .eq("status", "active")
      .or(buildWindowFilter(nowIso))
      .order("created_at", { ascending: false })

    if (promotionsError) {
      console.error("GET /api/client/promotions promotions error:", promotionsError)
      return NextResponse.json({ error: "Error al obtener promociones" }, { status: 500 })
    }

    const rows = (promotionsData ?? []) as PromotionRow[]
    const promotionIds = rows.map((promotion) => promotion.id)
    let redeemedMap = new Map<string, string>()

    if (promotionIds.length > 0) {
      const { data: userPromos, error: userPromosError } = await supabase
        .from("user_promotions")
        .select("promotion_id, used_at")
        .eq("profile_id", userId)
        .in("promotion_id", promotionIds)

      if (userPromosError) {
        console.error("GET /api/client/promotions user_promotions error:", userPromosError)
      } else {
        redeemedMap = new Map(
          ((userPromos ?? []) as UserPromotionRow[]).map((userPromotion) => [
            userPromotion.promotion_id,
            userPromotion.used_at,
          ])
        )
      }
    }

    const promotions: PromotionDto[] = rows
      .filter((promotion) => {
        const usesCount = promotion.uses_count ?? 0
        return promotion.max_uses == null || usesCount < promotion.max_uses
      })
      .map((promotion) => {
        const usesCount = promotion.uses_count ?? 0
        const redeemedAt = redeemedMap.get(promotion.id) ?? null
        const isRedeemed = redeemedAt != null

        return {
          id: promotion.id,
          title: promotion.title,
          description: promotion.description,
          discount_type: promotion.discount_type,
          discount_value: Number(promotion.discount_value),
          code: promotion.code,
          expires_at: promotion.expires_at,
          max_uses: promotion.max_uses,
          uses_count: usesCount,
          is_redeemed: isRedeemed,
          redeemed_at: redeemedAt,
          starts_at: promotion.starts_at,
          status: promotion.status,
          discountType: promotion.discount_type,
          discountValue: Number(promotion.discount_value),
          startsAt: promotion.starts_at,
          expiresAt: promotion.expires_at,
          maxUses: promotion.max_uses,
          usesCount,
          isRedeemed,
          redeemed: isRedeemed,
          redeemedAt,
        }
      })

    const paginatedPromotions = promotions.slice(offset, offset + limit)
    const total = promotions.length

    return NextResponse.json(
      { promotions: paginatedPromotions, total, limit, offset },
      { headers: { "X-Total-Count": String(total) } }
    )
  } catch (error) {
    console.error("GET /api/client/promotions unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
