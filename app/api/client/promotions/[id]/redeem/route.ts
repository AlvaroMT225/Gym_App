import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

interface PromoRow {
  id: string
  status: string
  expires_at: string | null
  max_uses: number | null
  uses_count: number
  gym_id: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: promotionId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const userId = sessionOrResponse.userId

    // Validate the promotion exists and is redeemable
    const { data: promo, error: promoError } = await supabase
      .from("promotions")
      .select("id, status, expires_at, max_uses, uses_count, gym_id")
      .eq("id", promotionId)
      .maybeSingle()

    if (promoError) {
      console.error("POST /api/client/promotions/[id]/redeem promo error:", promoError)
      return NextResponse.json({ error: "Error al verificar promoción" }, { status: 500 })
    }

    if (!promo) {
      return NextResponse.json({ error: "Promoción no encontrada" }, { status: 404 })
    }

    const row = promo as PromoRow

    if (row.status !== "active") {
      return NextResponse.json({ error: "Promoción no está activa" }, { status: 410 })
    }

    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return NextResponse.json({ error: "Promoción expirada" }, { status: 410 })
    }

    if (row.max_uses != null && row.uses_count >= row.max_uses) {
      return NextResponse.json({ error: "Promoción agotada" }, { status: 410 })
    }

    // Verify user belongs to this gym
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", userId)
      .single()

    if (profileError || !profile || profile.gym_id !== row.gym_id) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    // Insert into user_promotions — UNIQUE(profile_id, promotion_id) catches duplicates
    const { data: inserted, error: insertError } = await supabase
      .from("user_promotions")
      .insert({ profile_id: userId, promotion_id: promotionId })
      .select("used_at")
      .single()

    if (insertError) {
      if (insertError.code === "23505") {
        // unique_violation: already redeemed
        return NextResponse.json({ error: "Ya canjeaste esta promoción" }, { status: 409 })
      }
      console.error("POST /api/client/promotions/[id]/redeem insert error:", insertError)
      return NextResponse.json({ error: "Error al canjear promoción" }, { status: 500 })
    }

    // Increment uses_count
    await supabase
      .from("promotions")
      .update({ uses_count: row.uses_count + 1 })
      .eq("id", promotionId)

    return NextResponse.json({ success: true, redeemedAt: inserted.used_at })
  } catch (error) {
    console.error("POST /api/client/promotions/[id]/redeem unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
