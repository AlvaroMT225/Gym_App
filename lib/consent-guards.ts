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
  scope: string[]
  expires_at: string | null
  status: string
}

/**
 * Verifica que exista un consent activo entre coach y atleta en la DB.
 * Recibe el supabase client ya creado en el route para no duplicar clientes.
 */
export async function requireActiveConsent(
  supabase: SupabaseClient,
  coachId: string,
  athleteId: string
): Promise<{ consent: ConsentResult } | { error: NextResponse }> {
  const { data, error } = await supabase
    .from("consents")
    .select("id, scope, expires_at, status")
    .eq("coach_id", coachId)
    .eq("athlete_id", athleteId)
    .eq("status", "active")
    .single()

  if (error || !data) {
    return { error: NextResponse.json({ error: "Consentimiento invalido" }, { status: 403 }) }
  }

  return { consent: data as ConsentResult }
}

/**
 * Verifica que el consent incluya el scope requerido.
 * full_access cubre cualquier scope sin necesidad de listarlo individualmente.
 */
export function requireConsentScope(
  consent: ConsentResult,
  requiredScope: DbConsentScope
): { ok: true } | { error: NextResponse } {
  const scopes = consent.scope as string[]
  if (scopes.includes("full_access") || scopes.includes(requiredScope)) {
    return { ok: true }
  }
  return { error: NextResponse.json({ error: "Scope no permitido" }, { status: 403 }) }
}
