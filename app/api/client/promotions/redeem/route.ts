import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

interface RedeemPromotionResult {
  promotion_id: string
  redeemed_at: string
  uses_count: number
}

function mapRedeemError(error: { message?: string } | null) {
  const code = error?.message

  switch (code) {
    case "PROMO_NOT_FOUND":
      return { error: "Promocion no encontrada", status: 404 }
    case "PROMO_FORBIDDEN":
      return { error: "Acceso denegado", status: 403 }
    case "PROMO_INACTIVE":
      return { error: "Promocion no esta activa", status: 410 }
    case "PROMO_NOT_STARTED":
      return { error: "Promocion aun no disponible", status: 409 }
    case "PROMO_EXPIRED":
      return { error: "Promocion expirada", status: 410 }
    case "PROMO_EXHAUSTED":
      return { error: "Promocion agotada", status: 410 }
    case "PROMO_ALREADY_REDEEMED":
      return { error: "Ya canjeaste esta promocion", status: 409 }
    case "PROFILE_NOT_FOUND":
      return { error: "Perfil no encontrado", status: 403 }
    default:
      return null
  }
}

export async function POST(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const payload = await request.json().catch(() => null)
    const code = typeof payload?.code === "string" ? payload.code.trim() : ""

    if (!code) {
      return NextResponse.json({ error: "Codigo invalido" }, { status: 400 })
    }

    const supabase = await createClient(request)
    const { data, error } = await supabase.rpc("redeem_promotion", {
      p_code: code,
    })

    if (error) {
      const mappedError = mapRedeemError(error)

      if (mappedError) {
        return NextResponse.json({ error: mappedError.error }, { status: mappedError.status })
      }

      console.error("POST /api/client/promotions/redeem rpc error:", error)
      return NextResponse.json({ error: "Error al canjear promocion" }, { status: 500 })
    }

    const redeemed = (data as RedeemPromotionResult[] | null)?.[0]

    if (!redeemed) {
      console.error("POST /api/client/promotions/redeem missing result")
      return NextResponse.json({ error: "Error al canjear promocion" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      promotion_id: redeemed.promotion_id,
      redeemed_at: redeemed.redeemed_at,
      uses_count: redeemed.uses_count,
      promotionId: redeemed.promotion_id,
      redeemedAt: redeemed.redeemed_at,
      usesCount: redeemed.uses_count,
    })
  } catch (error) {
    console.error("POST /api/client/promotions/redeem unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
