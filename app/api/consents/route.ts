import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { listConsentsForAthlete, createConsent, coachExists, getCoachProfile, formatConsentForFrontend } from "@/lib/supabase/consent-queries"
import { handleApiError, validateBody } from "@/lib/api-utils"
import { consentBodySchema } from "@/lib/validations/athlete"

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse
  try {
    const consents = await listConsentsForAthlete(sessionOrResponse.userId)
    return NextResponse.json({ consents })
  } catch {
    return NextResponse.json({ error: "Error al obtener consentimientos" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse
  try {
    const { trainerId, scopes, expiresAt } = await validateBody(request, consentBodySchema)

    if (!(await coachExists(trainerId))) {
      return NextResponse.json({ error: "Entrenador invalido" }, { status: 400 })
    }

    const row = await createConsent({ athleteId: sessionOrResponse.userId, coachId: trainerId, mockScopes: scopes, expiresAt: expiresAt ?? null })
    const coach = await getCoachProfile(trainerId)
    return NextResponse.json({ consent: formatConsentForFrontend({ ...row, coach }) })
  } catch (error) {
    return handleApiError(error)
  }
}
