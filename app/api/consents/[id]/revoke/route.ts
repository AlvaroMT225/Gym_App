import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { getConsentById, revokeConsent } from "@/lib/consents"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const consent = getConsentById(id)
  if (!consent || consent.client_id !== sessionOrResponse.userId) {
    return NextResponse.json({ error: "Consentimiento no encontrado" }, { status: 404 })
  }

  const revoked = revokeConsent({
    id: consent.id,
    actorId: sessionOrResponse.userId,
    actorRole: sessionOrResponse.role,
  })

  return NextResponse.json({ consent: revoked })
}

