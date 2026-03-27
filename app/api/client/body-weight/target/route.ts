import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { handleApiError, validateBody } from "@/lib/api-utils"

const targetWeightSchema = z.object({
  target_weight_kg: z.number().min(20).max(300),
})

export async function PATCH(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const { target_weight_kg } = await validateBody(request, targetWeightSchema)
    const supabase = await createClient(request)
    const userId = sessionOrResponse.userId

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ target_weight_kg })
      .eq("id", userId)

    if (updateError) {
      console.error("PATCH /api/client/body-weight/target update error:", updateError)
      return NextResponse.json({ error: "Error al actualizar peso objetivo" }, { status: 500 })
    }

    const { data, error: selectError } = await supabase
      .from("profiles")
      .select("target_weight_kg")
      .eq("id", userId)
      .single()

    if (selectError) {
      console.error("PATCH /api/client/body-weight/target select error:", selectError)
      return NextResponse.json({ error: "Error al leer peso objetivo actualizado" }, { status: 500 })
    }

    return NextResponse.json({ target_weight_kg: data.target_weight_kg })
  } catch (error) {
    console.error("PATCH /api/client/body-weight/target unexpected error:", error)
    return handleApiError(error)
  }
}
