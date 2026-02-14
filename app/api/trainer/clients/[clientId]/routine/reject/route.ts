import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { rejectProposal } from "@/lib/trainer-data"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  // Only the client (USER) can reject their own routine proposal
  if (sessionOrResponse.userId !== clientId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const success = rejectProposal(clientId)
  if (!success) {
    return NextResponse.json({ error: "No hay propuesta pendiente" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
