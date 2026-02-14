import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { requireActiveConsent, requireConsentScope } from "@/lib/consent-guards"
import { exerciseCatalog } from "@/lib/trainer-data"

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const clientId = request.nextUrl.searchParams.get("clientId")
  if (!clientId) {
    return NextResponse.json({ error: "clientId requerido" }, { status: 400 })
  }

  const consentResult = requireActiveConsent({
    trainerId: sessionOrResponse.userId,
    clientId,
  })
  if ("error" in consentResult) return consentResult.error

  const scopeResult = requireConsentScope(consentResult.consent, "exercises:read")
  if ("error" in scopeResult) return scopeResult.error

  return NextResponse.json({ exercises: exerciseCatalog })
}

