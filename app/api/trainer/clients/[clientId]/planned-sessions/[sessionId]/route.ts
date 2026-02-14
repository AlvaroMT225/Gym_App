import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { requireActiveConsent, requireConsentScope } from "@/lib/consent-guards"
import { updatePlannedSession, getPlannedSessionById, deletePlannedSession } from "@/lib/planned-sessions"

export async function PUT(
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

  const scopeResult = requireConsentScope(consentResult.consent, "sessions:write")
  if ("error" in scopeResult) return scopeResult.error

  const existing = getPlannedSessionById(sessionId)
  if (!existing || existing.clientId !== clientId) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
  }

  const body = await request.json()

  const updated = updatePlannedSession({
    id: sessionId,
    title: body.title,
    description: body.description,
    scheduledAt: body.scheduledAt,
    items: body.items,
    status: body.status,
    changelogEntry: String(body.changelogEntry || "Actualización"),
  })

  if (!updated) {
    return NextResponse.json({ error: "Error al actualizar" }, { status: 400 })
  }

  return NextResponse.json({ session: updated })
}

export async function DELETE(
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

  const scopeResult = requireConsentScope(consentResult.consent, "sessions:write")
  if ("error" in scopeResult) return scopeResult.error

  const existing = getPlannedSessionById(sessionId)
  if (!existing || existing.clientId !== clientId) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
  }

  const deleted = deletePlannedSession(sessionId)
  if (!deleted) {
    return NextResponse.json({ error: "Error al eliminar" }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
