import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  // Only the athlete themselves can reject their proposal
  if (sessionOrResponse.userId !== clientId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  try {
    const supabase = await createClient()

    // Find the latest sent proposal for this athlete
    const { data: proposal, error: findError } = await supabase
      .from("proposals")
      .select("id")
      .eq("athlete_id", clientId)
      .eq("type", "routine")
      .eq("status", "sent")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (findError) {
      console.error("POST .../routine/reject find proposal error:", findError)
      return NextResponse.json({ error: "Error al buscar propuesta" }, { status: 500 })
    }

    if (!proposal) {
      return NextResponse.json({ error: "No hay propuesta pendiente" }, { status: 404 })
    }

    const { error: rejectError } = await supabase
      .from("proposals")
      .update({ status: "rejected", responded_at: new Date().toISOString() })
      .eq("id", proposal.id)

    if (rejectError) {
      console.error("POST .../routine/reject update proposal error:", rejectError)
      return NextResponse.json({ error: "Error al rechazar propuesta" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("POST .../routine/reject unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
