import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { handleApiError, validateBody } from "@/lib/api-utils"
import { planPriceUpdateBodySchema } from "@/lib/validations/plan-prices"

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

/* ---------- PUT ---------- */

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

    const body = await validateBody(request, planPriceUpdateBodySchema)
    const updates: Record<string, unknown> = {}
    if (body.price !== undefined) updates.price = body.price
    if (body.is_active !== undefined) updates.is_active = body.is_active

    const { data, error } = await supabase
      .from("gym_plan_prices")
      .update(updates)
      .eq("id", id)
      .eq("gym_id", gymId)
      .select()
      .maybeSingle()

    if (error || !data) {
      console.error("PUT /api/admin/plan-prices/[id] error:", error)
      return NextResponse.json({ error: "Error al actualizar tarifa" }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error("PUT /api/admin/plan-prices/[id] unexpected error:", err)
    return handleApiError(err)
  }
}

/* ---------- DELETE ---------- */

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

    const { error } = await supabase
      .from("gym_plan_prices")
      .delete()
      .eq("id", id)
      .eq("gym_id", gymId)

    if (error) {
      console.error("DELETE /api/admin/plan-prices/[id] error:", error)
      return NextResponse.json({ error: "Error al eliminar tarifa" }, { status: 500 })
    }

    return NextResponse.json({ message: "Plan price deleted" })
  } catch (err) {
    console.error("DELETE /api/admin/plan-prices/[id] unexpected error:", err)
    return handleApiError(err)
  }
}
