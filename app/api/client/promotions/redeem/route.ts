import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

interface RedeemPromotionRpcResponse {
  success?: boolean
  error?: string
  message?: string
  code?: string
  discount_type?: string
  discount_value?: number
  promotion_id?: string
  redeemed_at?: string
}

export async function POST(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const userId = sessionOrResponse.userId
    const payload = await request.json().catch(() => null)
    const code = typeof payload?.code === "string" ? payload.code.trim() : ""

    if (!code) {
      return NextResponse.json({ error: "Codigo invalido" }, { status: 400 })
    }

    const supabase = await createClient(request)
    const { data, error } = await supabase.rpc("redeem_promotion", {
      p_profile_id: userId,
      p_code: code,
    })

    if (error) {
      return NextResponse.json(
        { error: "SERVER_ERROR", message: error.message },
        { status: 500 }
      )
    }

    const rpcData = data as RedeemPromotionRpcResponse | null

    if (!rpcData || rpcData.success === false) {
      return NextResponse.json(
        {
          error: rpcData?.error ?? "UNKNOWN",
          message: rpcData?.message ?? "Error al canjear",
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, promotion: rpcData }, { status: 200 })
  } catch (error) {
    console.error("POST /api/client/promotions/redeem unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
