import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { paginationParams } from "@/lib/api-utils"

interface PaymentRow {
  id: string
  amount: number
  status: string
  method: string | null
  due_date: string | null
  paid_at: string | null
  reference_code: string | null
  created_at: string
}

interface PaymentDto {
  id: string
  amount: number
  status: string
  method: string | null
  dueDate: string | null
  paidAt: string | null
  referenceCode: string | null
  createdAt: string
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const userId = sessionOrResponse.userId
    const { searchParams } = new URL(request.url)
    const { limit, offset } = paginationParams(searchParams)

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", userId)
      .maybeSingle()

    if (profileError) {
      console.error("GET /api/user/payments profile error:", profileError)
      return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 })
    }

    if (!profile?.gym_id) {
      return NextResponse.json(
        { payments: [], total: 0, limit, offset },
        { headers: { "X-Total-Count": "0" } }
      )
    }

    const { data: paymentsData, count, error: paymentsError } = await supabase
      .from("payments")
      .select("id, amount, status, method, due_date, paid_at, reference_code, created_at", {
        count: "exact",
        head: false,
      })
      .eq("profile_id", userId)
      .eq("gym_id", profile.gym_id)
      .order("due_date", { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1)

    if (paymentsError) {
      console.error("GET /api/user/payments error:", paymentsError)
      return NextResponse.json({ error: "Error al obtener historial de pagos" }, { status: 500 })
    }

    const payments: PaymentDto[] = ((paymentsData ?? []) as PaymentRow[]).map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      status: p.status,
      method: p.method,
      dueDate: p.due_date,
      paidAt: p.paid_at,
      referenceCode: p.reference_code,
      createdAt: p.created_at,
    }))

    return NextResponse.json(
      { payments, total: count ?? 0, limit, offset },
      { headers: { "X-Total-Count": String(count ?? 0) } }
    )
  } catch (error) {
    console.error("GET /api/user/payments unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
