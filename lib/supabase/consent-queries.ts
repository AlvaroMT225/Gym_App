import { createClient } from "@/lib/supabase/server"

// ============================================================
// MAPEO DE SCOPES: DB ↔ Frontend (mock legacy)
// DB usa: view_progress, view_routines, manage_routines, etc.
// Frontend usa: sessions:read, progress:read, routines:write, etc.
// ============================================================

const DB_TO_MOCK_SCOPES: Record<string, string[]> = {
  view_progress: ["progress:read", "sessions:read"],
  view_routines: ["routines:read", "exercises:read"],
  manage_routines: ["routines:write", "sessions:write", "sessions:comment", "goals:write"],
  view_personal_records: ["prs:read"],
  view_achievements: ["achievements:read"],
  full_access: [
    "sessions:read", "sessions:comment", "sessions:write",
    "routines:read", "routines:write", "exercises:read",
    "progress:read", "prs:read", "achievements:read", "goals:write",
  ],
}

const MOCK_TO_DB_SCOPE: Record<string, string> = {
  "progress:read": "view_progress",
  "sessions:read": "view_progress",
  "routines:read": "view_routines",
  "exercises:read": "view_routines",
  "routines:write": "manage_routines",
  "sessions:write": "manage_routines",
  "sessions:comment": "manage_routines",
  "goals:write": "manage_routines",
  "prs:read": "view_personal_records",
  "achievements:read": "view_achievements",
}

/** Convierte array de DB scopes → array de mock scopes (para frontend) */
export function dbScopesToMock(dbScopes: string[]): string[] {
  const result = new Set<string>()
  for (const s of dbScopes) {
    const mapped = DB_TO_MOCK_SCOPES[s]
    if (mapped) mapped.forEach((m) => result.add(m))
  }
  return Array.from(result)
}

/** Convierte array de mock scopes → array de DB scopes (para INSERT/UPDATE) */
export function mockScopesToDb(mockScopes: string[]): string[] {
  const result = new Set<string>()
  for (const s of mockScopes) {
    const mapped = MOCK_TO_DB_SCOPE[s]
    if (mapped) result.add(mapped)
  }
  return Array.from(result)
}

/** Convierte status DB (lowercase) → frontend (UPPERCASE) */
export function dbStatusToFrontend(status: string): string {
  return status.toUpperCase()
}

/** Convierte un row de DB a formato que espera el frontend */
export function formatConsentForFrontend(row: {
  id: string
  athlete_id: string
  coach_id: string
  status: string
  scope: string[]
  expires_at: string | null
  revoked_at: string | null
  is_hidden_by_athlete: boolean
  created_at: string
  updated_at: string
  coach?: { id: string; first_name: string; last_name: string; avatar_url: string | null } | null
}) {
  return {
    id: row.id,
    client_id: row.athlete_id,
    trainer_id: row.coach_id,
    status: dbStatusToFrontend(row.status),
    scopes: dbScopesToMock(row.scope),
    expires_at: row.expires_at,
    revoked_at: row.revoked_at,
    hidden_by_client: row.is_hidden_by_athlete,
    created_at: row.created_at,
    updated_at: row.updated_at,
    trainer: row.coach
      ? {
          id: row.coach.id,
          name: `${row.coach.first_name} ${row.coach.last_name}`.trim(),
          avatar: row.coach.avatar_url
            || `${row.coach.first_name?.[0] || ""}${row.coach.last_name?.[0] || ""}`.toUpperCase(),
        }
      : null,
  }
}

// ============================================================
// QUERIES
// ============================================================

/** Lista consents de un atleta con info del coach (para GET /api/consents) */
export async function listConsentsForAthlete(athleteId: string) {
  const supabase = await createClient()

  // Query 1: todos los consents del atleta
  const { data: consents, error: cErr } = await supabase
    .from("consents")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("created_at", { ascending: false })
  if (cErr) throw cErr
  if (!consents || consents.length === 0) return []

  // Query 2: obtener coaches únicos
  const coachIds = [...new Set(consents.map((c) => c.coach_id))]
  const { data: coaches, error: pErr } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, avatar_url")
    .in("id", coachIds)
  if (pErr) throw pErr

  // Crear mapa de coaches por ID
  const coachMap = new Map<string, { id: string; first_name: string; last_name: string; avatar_url: string | null }>()
  for (const c of coaches || []) {
    coachMap.set(c.id, c)
  }

  // Mapear cada consent con su coach
  return consents.map((row) => {
    const coach = coachMap.get(row.coach_id) || null
    return formatConsentForFrontend({ ...row, coach })
  })
}

/** Obtiene un consent por ID */
export async function getConsentById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("consents")
    .select("*")
    .eq("id", id)
    .single()
  if (error) return null
  return data
}

/** Crea un consent nuevo */
export async function createConsent(input: {
  athleteId: string
  coachId: string
  mockScopes: string[]
  expiresAt: string | null
}) {
  const supabase = await createClient()
  const dbScopes = mockScopesToDb(input.mockScopes)
  const { data, error } = await supabase
    .from("consents")
    .insert({
      athlete_id: input.athleteId,
      coach_id: input.coachId,
      status: "active",
      scope: dbScopes,
      expires_at: input.expiresAt,
      granted_at: new Date().toISOString(),
      is_hidden_by_athlete: false,
    })
    .select("*")
    .single()
  if (error) throw error
  return data
}

/** Actualiza scopes y/o expiración de un consent */
export async function updateConsent(input: {
  id: string
  mockScopes?: string[]
  expiresAt?: string | null
}) {
  const supabase = await createClient()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.mockScopes) updates.scope = mockScopesToDb(input.mockScopes)
  if (input.expiresAt !== undefined) updates.expires_at = input.expiresAt
  const { data, error } = await supabase
    .from("consents")
    .update(updates)
    .eq("id", input.id)
    .select("*")
    .single()
  if (error) throw error
  return data
}

/** Revoca un consent */
export async function revokeConsent(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("consents")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single()
  if (error) throw error
  return data
}

/** Oculta un consent para el atleta */
export async function hideConsent(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("consents")
    .update({ is_hidden_by_athlete: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single()
  if (error) throw error
  return data
}

/** Restaura visibilidad de un consent */
export async function restoreConsent(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("consents")
    .update({ is_hidden_by_athlete: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single()
  if (error) throw error
  return data
}

/** Verifica si un coach existe en profiles */
export async function coachExists(coachId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", coachId)
    .eq("role", "coach")
    .single()
  return !!data
}

/** Obtiene perfil básico de un coach por ID */
export async function getCoachProfile(coachId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, avatar_url")
    .eq("id", coachId)
    .single()
  return data || null
}
