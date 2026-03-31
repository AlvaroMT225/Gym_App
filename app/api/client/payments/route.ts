import { NextRequest, NextResponse } from "next/server"
import { paginationParams } from "@/lib/api-utils"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

interface MembershipRef {
  plan_type: string | null
  end_date: string | null
}

interface PaymentRow {
  id: string
  amount: number
  status: string | null
  method: string | null
  gateway_name: string | null
  reference_code: string | null
  due_date: string | null
  paid_at: string | null
  membership: unknown
}

function normalizeEmbed<T>(raw: unknown): T | null {
  if (!raw) return null
  if (Array.isArray(raw)) return (raw[0] as T) ?? null
  return raw as T
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
      console.error("GET /api/client/payments profile error:", profileError)
      return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 })
    }

    if (!profile?.gym_id) {
      return NextResponse.json(
        { payments: [], total: 0, limit, offset },
        { headers: { "X-Total-Count": "0" } }
      )
    }

    const { data, count, error } = await supabase
      .from("payments")
      .select(
        "id, amount, status, method, gateway_name, reference_code, due_date, paid_at, membership:memberships!membership_id(plan_type, end_date)",
        {
          count: "exact",
          head: false,
        }
      )
      .eq("profile_id", userId)
      .eq("gym_id", profile.gym_id)
      .order("due_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("GET /api/client/payments error:", error)
      return NextResponse.json({ error: "Error al obtener historial de pagos" }, { status: 500 })
    }

    const payments = ((data ?? []) as PaymentRow[]).map((payment) => {
      const membership = normalizeEmbed<MembershipRef>(payment.membership)

      return {
        id: payment.id,
        amount: Number(payment.amount),
        status: payment.status,
        method: payment.method,
        gateway_name: payment.gateway_name,
        reference_code: payment.reference_code,
        due_date: payment.due_date,
        paid_at: payment.paid_at,
        membership: membership
          ? {
              plan_type: membership.plan_type,
              end_date: membership.end_date,
            }
          : null,
      }
    })

    return NextResponse.json(
      { payments, total: count ?? 0, limit, offset },
      { headers: { "X-Total-Count": String(count ?? 0) } }
    )
  } catch (error) {
    console.error("GET /api/client/payments unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
