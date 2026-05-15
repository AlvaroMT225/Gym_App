import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"

// Enum DB real: consent_scope en Supabase
export type DbConsentScope =
  | "view_progress"
  | "view_routines"
  | "manage_routines"
  | "view_personal_records"
  | "view_achievements"
  | "full_access"

export interface ConsentResult {
  id: string
  scope: unknown
  expires_at: string | null
  status: string
  revoked_at: string | null
  is_hidden_by_athlete: boolean | null
}

function consentError() {
  return { error: NextResponse.json({ error: "Consentimiento invalido" }, { status: 403 }) }
}

function scopeError() {
  return { error: NextResponse.json({ error: "Scope no permitido" }, { status: 403 }) }
}

function normalizeConsentScopes(scope: unknown): string[] {
  if (Array.isArray(scope)) {
    return scope.filter((item): item is string => typeof item === "string")
  }

  if (typeof scope === "string") {
    return scope
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

export function isActiveConsent(consent: ConsentResult, now = new Date()): boolean {
  if (consent.status !== "active") return false
  if (consent.revoked_at) return false
  if (consent.is_hidden_by_athlete) return false

  if (!consent.expires_at) return true

  const expiresAt = new Date(consent.expires_at)
  if (Number.isNaN(expiresAt.getTime())) return false

  return expiresAt > now
}

export function hasConsentScope(consent: ConsentResult, requiredScope: DbConsentScope): boolean {
  const scopes = normalizeConsentScopes(consent.scope)
  return scopes.includes("full_access") || scopes.includes(requiredScope)
}

/**
 * Verifica que exista un consent activo entre coach y atleta en la DB.
 * Recibe el supabase client ya creado en el route para no duplicar clientes.
 */
export async function requireActiveConsent(
  supabase: SupabaseClient,
  coachId: string,
  athleteId: string,
  requiredScope?: DbConsentScope
): Promise<{ consent: ConsentResult } | { error: NextResponse }> {
  const { data, error } = await supabase
    .from("consents")
    .select("id, scope, expires_at, status, revoked_at, is_hidden_by_athlete")
    .eq("coach_id", coachId)
    .eq("athlete_id", athleteId)
    .eq("status", "active")
    .maybeSingle()

  if (error || !data) {
    return consentError()
  }

  const consent = data as ConsentResult
  if (!isActiveConsent(consent)) {
    return consentError()
  }

  if (requiredScope && !hasConsentScope(consent, requiredScope)) {
    return scopeError()
  }

  return { consent }
}

export async function requireActiveConsentScope(
  supabase: SupabaseClient,
  coachId: string,
  athleteId: string,
  requiredScope: DbConsentScope
): Promise<{ consent: ConsentResult } | { error: NextResponse }> {
  return requireActiveConsent(supabase, coachId, athleteId, requiredScope)
}

/**
 * Verifica que el consent incluya el scope requerido.
 * full_access cubre cualquier scope sin necesidad de listarlo individualmente.
 */
export function requireConsentScope(
  consent: ConsentResult,
  requiredScope: DbConsentScope
): { ok: true } | { error: NextResponse } {
  if (!isActiveConsent(consent)) {
    return consentError()
  }

  if (hasConsentScope(consent, requiredScope)) {
    return { ok: true }
  }

  return scopeError()
}
