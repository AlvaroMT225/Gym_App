import { NextResponse } from "next/server"
import { type Consent, type ConsentScope, getActiveConsent } from "@/lib/consents"

export function requireActiveConsent(input: {
  trainerId: string
  clientId: string
}): { consent: Consent } | { error: NextResponse } {
  const consent = getActiveConsent(input.trainerId, input.clientId)
  if (!consent) {
    return { error: NextResponse.json({ error: "Consentimiento invalido" }, { status: 403 }) }
  }
  return { consent }
}

export function requireConsentScope(
  consent: Consent,
  scope: ConsentScope
): { ok: true } | { error: NextResponse } {
  if (!consent.scopes.includes(scope)) {
    return { error: NextResponse.json({ error: "Scope no permitido" }, { status: 403 }) }
  }
  return { ok: true }
}

