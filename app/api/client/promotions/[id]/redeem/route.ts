import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

interface RedeemPromotionResult {
  promotion_id: string
  redeemed_at: string
  uses_count: number
}

interface PromotionRow {
  id: string
  title: string
  description: string | null
  code: string | null
  discount_type: string | null
  discount_value: number
  expires_at: string | null
  max_uses: number | null
  uses_count: number | null
}

interface UserPromotionRow {
  used_at: string
}

interface RpcErrorLike {
  code?: string
  message?: string
  details?: string
  hint?: string
}

interface PromotionRedeemDto {
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
}

function mapRedeemError(error: RpcErrorLike | null) {
  const code = error?.message

  switch (code) {
    case "AUTH_REQUIRED":
      return { error: "No autorizado", status: 401 }
    case "PROMO_IDENTIFIER_REQUIRED":
      return { error: "Promocion invalida", status: 400 }
    case "PROFILE_NOT_FOUND":
      return { error: "Perfil no encontrado", status: 404 }
    case "PROMO_NOT_FOUND":
      return { error: "Promocion no encontrada", status: 404 }
    case "PROMO_FORBIDDEN":
      return { error: "Acceso denegado", status: 403 }
    case "PROMO_INACTIVE":
      return { error: "Promocion no esta activa", status: 409 }
    case "PROMO_NOT_STARTED":
      return { error: "Promocion aun no disponible", status: 409 }
    case "PROMO_EXPIRED":
      return { error: "Promocion expirada", status: 410 }
    case "PROMO_EXHAUSTED":
      return { error: "Promocion agotada", status: 409 }
    case "PROMO_ALREADY_REDEEMED":
      return { error: "Ya canjeaste esta promocion", status: 409 }
    default:
      return null
  }
}

function logRedeemFailure(context: string, error: RpcErrorLike | null) {
  console.error(context, {
    code: error?.code ?? null,
    message: error?.message ?? null,
    details: error?.details ?? null,
    hint: error?.hint ?? null,
  })
}

function describeRedeemResult(value: unknown) {
  if (Array.isArray(value)) {
    return { type: "array", length: value.length }
  }

  return { type: value === null ? "null" : typeof value }
}

function normalizeRedeemResult(
  value: RedeemPromotionResult[] | RedeemPromotionResult | null
): RedeemPromotionResult | null {
  if (!value) return null
  if (Array.isArray(value)) return value[0] ?? null

  if (
    typeof value === "object" &&
    typeof value.promotion_id === "string" &&
    typeof value.redeemed_at === "string" &&
    typeof value.uses_count === "number"
  ) {
    return value
  }

  return null
}

async function fetchRedeemedPromotion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  promotionId: string
): Promise<PromotionRedeemDto | null> {
  const [{ data: promotion, error: promotionError }, { data: redemption, error: redemptionError }] =
    await Promise.all([
      supabase
        .from("promotions")
        .select(
          "id, title, description, code, discount_type, discount_value, expires_at, max_uses, uses_count"
        )
        .eq("id", promotionId)
        .maybeSingle(),
      supabase
        .from("user_promotions")
        .select("used_at")
        .eq("profile_id", userId)
        .eq("promotion_id", promotionId)
        .maybeSingle(),
    ])

  if (promotionError) {
    logRedeemFailure("POST /api/client/promotions/[id]/redeem promotion fetch error:", promotionError)
    throw new Error("PROMOTION_FETCH_FAILED")
  }

  if (redemptionError) {
    logRedeemFailure("POST /api/client/promotions/[id]/redeem redemption fetch error:", redemptionError)
    throw new Error("REDEMPTION_FETCH_FAILED")
  }

  if (!promotion) {
    return null
  }

  const promotionRow = promotion as PromotionRow
  const redemptionRow = (redemption ?? null) as UserPromotionRow | null

  return {
    id: promotionRow.id,
    title: promotionRow.title,
    description: promotionRow.description,
    discount_type: promotionRow.discount_type,
    discount_value: Number(promotionRow.discount_value),
    code: promotionRow.code,
    expires_at: promotionRow.expires_at,
    max_uses: promotionRow.max_uses,
    uses_count: promotionRow.uses_count ?? 0,
    is_redeemed: redemptionRow != null,
    redeemed_at: redemptionRow?.used_at ?? null,
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: promotionId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const userId = sessionOrResponse.userId
    const supabase = await createClient(request)
    const { data, error } = await supabase.rpc("redeem_promotion", {
      p_promotion_id: promotionId,
    })

    if (error) {
      const mappedError = mapRedeemError(error)

      if (mappedError) {
        return NextResponse.json({ error: mappedError.error }, { status: mappedError.status })
      }

      logRedeemFailure("POST /api/client/promotions/[id]/redeem rpc error:", error)
      return NextResponse.json(
        {
          error: "Error al canjear promocion",
          code: "PROMOTION_REDEEM_FAILED",
        },
        { status: 500 }
      )
    }

    const redeemed = normalizeRedeemResult(
      data as RedeemPromotionResult[] | RedeemPromotionResult | null
    )

    if (!redeemed) {
      console.error(
        "POST /api/client/promotions/[id]/redeem invalid rpc result:",
        describeRedeemResult(data)
      )
      return NextResponse.json(
        {
          error: "Error al canjear promocion",
          code: "PROMOTION_REDEEM_RESULT_INVALID",
        },
        { status: 500 }
      )
    }

    const promotion = await fetchRedeemedPromotion(supabase, userId, redeemed.promotion_id)

    if (!promotion) {
      console.error("POST /api/client/promotions/[id]/redeem redeemed promotion not found:", {
        promotionId: redeemed.promotion_id,
      })
      return NextResponse.json(
        {
          error: "Error al canjear promocion",
          code: "PROMOTION_REDEEM_RESULT_MISSING_PROMOTION",
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      promotion,
    })
  } catch (error) {
    console.error("POST /api/client/promotions/[id]/redeem unexpected error:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        code: "PROMOTION_REDEEM_UNEXPECTED",
      },
      { status: 500 }
    )
  }
}
