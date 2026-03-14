import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { handleApiError, validateBody } from "@/lib/api-utils"
import { planPriceBodySchema } from "@/lib/validations/plan-prices"

async function getAdminGymId(
  adminId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("gym_id")
    .eq("id", adminId)
    .maybeSingle()
  if (error || !data?.gym_id) return null
  return data.gym_id as string
}

/* ---------- GET ---------- */

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const gymId = await getAdminGymId(sessionOrResponse.userId, supabase)
    if (!gymId) {
      return NextResponse.json(
        { error: "No se pudo obtener el gym del administrador" },
        { status: 500 }
      )
    }

    const { data, error } = await supabase
      .from("gym_plan_prices")
      .select("*")
      .eq("gym_id", gymId)
      .order("price", { ascending: true })

    if (error) {
      console.error("GET /api/admin/plan-prices error:", error)
      return NextResponse.json({ error: "Error al obtener tarifas" }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error("GET /api/admin/plan-prices unexpected error:", err)
    return handleApiError(err)
  }
}

/* ---------- POST (upsert) ---------- */

export async function POST(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const gymId = await getAdminGymId(sessionOrResponse.userId, supabase)
    if (!gymId) {
      return NextResponse.json(
        { error: "No se pudo obtener el gym del administrador" },
        { status: 500 }
      )
    }

    const { plan_type, price, is_active } = await validateBody(request, planPriceBodySchema)

    const { data, error } = await supabase
      .from("gym_plan_prices")
      .upsert(
        { gym_id: gymId, plan_type, price, is_active: is_active ?? true },
        { onConflict: "gym_id,plan_type" }
      )
      .select()
      .maybeSingle()

    if (error || !data) {
      console.error("POST /api/admin/plan-prices upsert error:", error)
      return NextResponse.json({ error: "Error al guardar tarifa" }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error("POST /api/admin/plan-prices unexpected error:", err)
    return handleApiError(err)
  }
}
