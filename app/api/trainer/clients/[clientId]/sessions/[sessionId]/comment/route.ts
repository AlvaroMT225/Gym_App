import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { requireActiveConsent, requireConsentScope } from "@/lib/consent-guards"
import { listSessionsForClient, sessionComments } from "@/lib/trainer-data"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string; sessionId: string }> }
) {
  const { clientId, sessionId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const consentResult = requireActiveConsent({
    trainerId: sessionOrResponse.userId,
    clientId,
  })
  if ("error" in consentResult) return consentResult.error

  const scopeResult = requireConsentScope(consentResult.consent, "sessions:comment")
  if ("error" in scopeResult) return scopeResult.error

  const session = listSessionsForClient(clientId).find(
    (s) => s.id === sessionId
  )
  if (!session) {
    return NextResponse.json({ error: "Sesion no encontrada" }, { status: 404 })
  }

  const body = await request.json()
  const comment = String(body.comment || "").trim()
  if (!comment) {
    return NextResponse.json({ error: "Comentario requerido" }, { status: 400 })
  }

  const entry = {
    id: `sc-${Date.now()}`,
    sessionId,
    clientId,
    trainerId: sessionOrResponse.userId,
    comment,
    createdAt: new Date().toISOString(),
  }
  sessionComments.unshift(entry)

  return NextResponse.json({ comment: entry })
}

