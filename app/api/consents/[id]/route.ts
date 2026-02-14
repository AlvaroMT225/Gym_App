import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { CONSENT_SCOPES, getConsentById, updateConsent } from "@/lib/consents"

export async function PATCH(
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
  if (consent.status !== "ACTIVE") {
    return NextResponse.json({ error: "Consentimiento no activo" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const scopes = Array.isArray(body.scopes)
      ? body.scopes.filter((s: string) => CONSENT_SCOPES.includes(s))
      : undefined
    const expiresAt =
      body.expiresAt === null || body.expiresAt === undefined ? undefined : String(body.expiresAt)

    const updated = updateConsent({
      id: consent.id,
      scopes,
      expiresAt,
      actorId: sessionOrResponse.userId,
      actorRole: sessionOrResponse.role,
    })

    return NextResponse.json({ consent: updated })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al actualizar" },
      { status: 400 }
    )
  }
}

