import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { getConsentById, updateConsent, formatConsentForFrontend } from "@/lib/supabase/consent-queries"
import { handleApiError, validateBody } from "@/lib/api-utils"
import { consentUpdateBodySchema } from "@/lib/validations/athlete"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse
  try {
    const consent = await getConsentById(id)
    if (!consent || consent.athlete_id !== sessionOrResponse.userId) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    }
    if (consent.status !== "active") {
      return NextResponse.json({ error: "Solo se puede editar un consentimiento activo" }, { status: 403 })
    }

    const { scopes, expiresAt } = await validateBody(request, consentUpdateBodySchema)

    const row = await updateConsent({ id, mockScopes: scopes, expiresAt: expiresAt === undefined ? undefined : (expiresAt ?? null) })
    return NextResponse.json({ consent: formatConsentForFrontend(row) })
  } catch (error) {
    return handleApiError(error)
  }
}
