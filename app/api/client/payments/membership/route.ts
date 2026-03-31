import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

function currentDateIso() {
  return new Date().toISOString().slice(0, 10)
}

function calculateDaysRemaining(endDate: string | null) {
  if (!endDate) {
    return null
  }

  const today = new Date()
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const endUtc = Date.parse(`${endDate}T00:00:00Z`)

  if (Number.isNaN(endUtc)) {
    return null
  }

  return Math.max(0, Math.ceil((endUtc - todayUtc) / 86_400_000))
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient(request)
    const userId = sessionOrResponse.userId

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", userId)
      .maybeSingle()

    if (profileError) {
      console.error("GET /api/client/payments/membership profile error:", profileError)
      return NextResponse.json({ error: "Error al obtener membresia" }, { status: 500 })
    }

    if (!profile?.gym_id) {
      return NextResponse.json({ membership: null })
    }

    const todayIso = currentDateIso()
    const { data: membership, error: membershipError } = await supabase
      .from("memberships")
      .select("id, plan_type, status, start_date, end_date, auto_renew")
      .eq("profile_id", userId)
      .eq("gym_id", profile.gym_id)
      .eq("status", "active")
      .or(`end_date.is.null,end_date.gte.${todayIso}`)
      .order("end_date", { ascending: false, nullsFirst: false })
      .order("start_date", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()

    if (membershipError) {
      console.error("GET /api/client/payments/membership memberships error:", membershipError)
      return NextResponse.json({ error: "Error al obtener membresia" }, { status: 500 })
    }

    if (!membership) {
      return NextResponse.json({ membership: null })
    }

    return NextResponse.json({
      membership: {
        id: membership.id,
        plan_type: membership.plan_type,
        status: membership.status,
        start_date: membership.start_date,
        end_date: membership.end_date,
        auto_renew: membership.auto_renew,
        days_remaining: calculateDaysRemaining(membership.end_date),
      },
    })
  } catch (error) {
    console.error("GET /api/client/payments/membership unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
