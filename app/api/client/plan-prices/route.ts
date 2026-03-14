import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER", "athlete", "ADMIN", "coach"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const userId = sessionOrResponse.userId

  try {
    const supabase = await createClient()

    // Get user's gym_id from profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", userId)
      .maybeSingle()

    if (profileError || !profile?.gym_id) {
      return NextResponse.json({ error: "No se pudo obtener el perfil del usuario" }, { status: 500 })
    }

    const gymId = profile.gym_id as string

    // Get active plan prices for this gym
    const { data: plans, error: plansError } = await supabase
      .from("gym_plan_prices")
      .select("*")
      .eq("gym_id", gymId)
      .eq("is_active", true)
      .order("price", { ascending: true })

    if (plansError) {
      console.error("GET /api/client/plan-prices error:", plansError)
      return NextResponse.json({ error: "Error al obtener planes" }, { status: 500 })
    }

    // Get current membership
    const { data: membership, error: membershipError } = await supabase
      .from("memberships")
      .select("plan_type, price_paid, status, end_date")
      .eq("profile_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (membershipError) {
      console.error("GET /api/client/plan-prices membership error:", membershipError)
    }

    return NextResponse.json({
      data: plans ?? [],
      currentPlan: membership
        ? {
            plan_type: (membership as { plan_type: string | null }).plan_type,
            price_paid: (membership as { price_paid: number | null }).price_paid,
            status: (membership as { status: string }).status,
            end_date: (membership as { end_date: string | null }).end_date,
          }
        : null,
    })
  } catch (err) {
    console.error("GET /api/client/plan-prices unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
