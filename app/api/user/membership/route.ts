import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const userId = sessionOrResponse.userId

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", userId)
      .maybeSingle()

    if (profileError) {
      console.error("GET /api/user/membership profile error:", profileError)
      return NextResponse.json({ error: "Error al obtener membresia" }, { status: 500 })
    }

    if (!profile?.gym_id) {
      return NextResponse.json({ membership: null, nextPayment: null })
    }

    const { data: membershipRow, error: membershipError } = await supabase
      .from("memberships")
      .select("id, plan_type, status, start_date, end_date, auto_renew, price_paid")
      .eq("profile_id", userId)
      .eq("gym_id", profile.gym_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (membershipError) {
      console.error("GET /api/user/membership memberships error:", membershipError)
      return NextResponse.json({ error: "Error al obtener membresia" }, { status: 500 })
    }

    const { data: paymentRow, error: paymentError } = await supabase
      .from("payments")
      .select("id, amount, status, due_date, paid_at, method, reference_code")
      .eq("profile_id", userId)
      .eq("gym_id", profile.gym_id)
      .in("status", ["pending", "overdue"])
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (paymentError) {
      console.error("GET /api/user/membership payments error:", paymentError)
      return NextResponse.json({ error: "Error al obtener membresia" }, { status: 500 })
    }

    return NextResponse.json({
      membership: membershipRow
        ? {
            id: membershipRow.id,
            planType: membershipRow.plan_type,
            status: membershipRow.status,
            startDate: membershipRow.start_date,
            endDate: membershipRow.end_date,
            autoRenew: membershipRow.auto_renew,
            pricePaid: membershipRow.price_paid,
          }
        : null,
      nextPayment: paymentRow
        ? {
            id: paymentRow.id,
            amount: paymentRow.amount,
            status: paymentRow.status,
            dueDate: paymentRow.due_date,
            paidAt: paymentRow.paid_at,
            method: paymentRow.method,
            referenceCode: paymentRow.reference_code,
          }
        : null,
    })
  } catch (error) {
    console.error("GET /api/user/membership unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
