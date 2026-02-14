import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { requireActiveConsent } from "@/lib/consent-guards"
import { getClientById } from "@/lib/trainer-data"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const consentResult = requireActiveConsent({
    trainerId: sessionOrResponse.userId,
    clientId,
  })
  if ("error" in consentResult) return consentResult.error

  const client = getClientById(clientId)
  if (!client) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
  }

  return NextResponse.json({
    client,
    consent: {
      status: consentResult.consent.status,
      scopes: consentResult.consent.scopes,
      expires_at: consentResult.consent.expires_at,
    },
  })
}
