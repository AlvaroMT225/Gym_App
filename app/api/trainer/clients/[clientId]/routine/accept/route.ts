import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { acceptProposal } from "@/lib/trainer-data"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  // Only the client (USER) can accept their own routine proposal
  if (sessionOrResponse.userId !== clientId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const newActive = acceptProposal(clientId)
  if (!newActive) {
    return NextResponse.json({ error: "No hay propuesta pendiente" }, { status: 404 })
  }

  return NextResponse.json({ routine: newActive })
}
