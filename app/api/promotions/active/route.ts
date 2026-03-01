import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import type { PromoStatus } from "@/lib/supabase/types/database"

const ACTIVE_STATUS: PromoStatus = "active"

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", sessionOrResponse.userId)
      .maybeSingle()

    if (profileError) {
      console.error("GET /api/promotions/active profile error:", profileError)
      return NextResponse.json({ error: "Error al obtener promociones" }, { status: 500 })
    }

    if (!profile?.gym_id) {
      return NextResponse.json({ promotion: null })
    }

    const nowIso = new Date().toISOString()
    const windowFilter = `or(and(starts_at.is.null,expires_at.is.null),and(starts_at.is.null,expires_at.gte.${nowIso}),and(starts_at.lte.${nowIso},expires_at.is.null),and(starts_at.lte.${nowIso},expires_at.gte.${nowIso}))`

    const { data, error } = await supabase
      .from("promotions")
      .select(
        "id, gym_id, title, description, discount_type, discount_value, code, status, starts_at, expires_at, max_uses, uses_count"
      )
      .eq("gym_id", profile.gym_id)
      .eq("status", ACTIVE_STATUS)
      .or(windowFilter)
      .order("created_at", { ascending: false })
      .limit(5)

    if (error) {
      console.error("GET /api/promotions/active query error:", error)
      return NextResponse.json({ error: "Error al obtener promociones" }, { status: 500 })
    }

    const validPromotion =
      (data ?? []).find(
        (promotion) => promotion.max_uses == null || promotion.uses_count < promotion.max_uses
      ) ?? null

    return NextResponse.json({
      promotion: validPromotion
        ? {
            id: validPromotion.id,
            title: validPromotion.title,
            description: validPromotion.description,
            discount_type: validPromotion.discount_type,
            discount_value: validPromotion.discount_value,
            code: validPromotion.code,
            status: validPromotion.status,
            starts_at: validPromotion.starts_at,
            expires_at: validPromotion.expires_at,
          }
        : null,
    })
  } catch (error) {
    console.error("GET /api/promotions/active unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
