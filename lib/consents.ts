import type { Role } from "@/lib/auth/types"

export type ConsentStatus = "ACTIVE" | "REVOKED" | "EXPIRED"

export type ConsentScope =
  | "sessions:read"
  | "sessions:comment"
  | "sessions:write"
  | "routines:read"
  | "routines:write"
  | "exercises:read"
  | "progress:read"
  | "prs:read"
  | "achievements:read"
  | "goals:write"

export const CONSENT_SCOPES: ConsentScope[] = [
  "sessions:read",
  "sessions:comment",
  "sessions:write",
  "routines:read",
  "routines:write",
  "exercises:read",
  "progress:read",
  "prs:read",
  "achievements:read",
  "goals:write",
]

export interface ConsentAuditEntry {
  id: string
  actorId: string
  actorRole: Role
  beforeScopes: ConsentScope[]
  afterScopes: ConsentScope[]
  createdAt: string
}

export interface Consent {
  id: string
  client_id: string
  trainer_id: string
  status: ConsentStatus
  scopes: ConsentScope[]
  expires_at: string | null
  revoked_at: string | null
  created_at: string
  updated_at: string
  audit?: ConsentAuditEntry[]
  hidden_by_client?: boolean
}

const consentStore: Consent[] = [
  // demo-user (Alex Trainer) starts with no active consents — user selects trainer manually
  {
    id: "consent-2",
    client_id: "client-ana",
    trainer_id: "trainer-1",
    status: "ACTIVE",
    scopes: ["sessions:read", "progress:read"],
    expires_at: "2026-04-20T23:59:59",
    revoked_at: null,
    created_at: "2026-01-05T12:00:00",
    updated_at: "2026-01-05T12:00:00",
    hidden_by_client: false,
  },
  {
    id: "consent-3",
    client_id: "client-luis",
    trainer_id: "trainer-1",
    status: "REVOKED",
    scopes: ["sessions:read", "routines:read", "progress:read"],
    expires_at: "2026-02-28T23:59:59",
    revoked_at: "2026-02-03T18:20:00",
    created_at: "2026-01-20T09:30:00",
    updated_at: "2026-02-03T18:20:00",
    hidden_by_client: false,
  },
]

function nowIso(): string {
  return new Date().toISOString()
}

function isExpired(expiresAt: string | null, now = new Date()): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() < now.getTime()
}

export function normalizeConsent(consent: Consent, now = new Date()): Consent {
  if (consent.status === "ACTIVE" && isExpired(consent.expires_at, now)) {
    consent.status = "EXPIRED"
    consent.updated_at = nowIso()
  }
  return consent
}

export function listConsentsForClient(clientId: string): Consent[] {
  return consentStore
    .filter((c) => c.client_id === clientId)
    .map((c) => normalizeConsent({ ...c }))
}

export function listActiveConsentsForTrainer(trainerId: string): Consent[] {
  return consentStore
    .filter((c) => c.trainer_id === trainerId)
    .map((c) => normalizeConsent({ ...c }))
    .filter((c) => c.status === "ACTIVE")
}

export function getConsentById(id: string): Consent | undefined {
  const found = consentStore.find((c) => c.id === id)
  return found ? normalizeConsent({ ...found }) : undefined
}

export function findConsentByTrainerClient(trainerId: string, clientId: string): Consent | undefined {
  const found = consentStore.find(
    (c) => c.trainer_id === trainerId && c.client_id === clientId
  )
  return found ? normalizeConsent({ ...found }) : undefined
}

export function getActiveConsent(trainerId: string, clientId: string): Consent | undefined {
  const consent = findConsentByTrainerClient(trainerId, clientId)
  if (!consent) return undefined
  return consent.status === "ACTIVE" ? consent : undefined
}

export function createConsent(input: {
  clientId: string
  trainerId: string
  scopes: ConsentScope[]
  expiresAt: string | null
}): Consent {
  const existing = getActiveConsent(input.trainerId, input.clientId)
  if (existing) {
    throw new Error("Active consent already exists")
  }
  const createdAt = nowIso()
  const consent: Consent = {
    id: `consent-${Date.now()}`,
    client_id: input.clientId,
    trainer_id: input.trainerId,
    status: "ACTIVE",
    scopes: input.scopes,
    expires_at: input.expiresAt,
    revoked_at: null,
    created_at: createdAt,
    updated_at: createdAt,
  }
  consentStore.unshift(consent)
  return { ...consent }
}

export function updateConsent(input: {
  id: string
  scopes?: ConsentScope[]
  expiresAt?: string | null
  actorId: string
  actorRole: Role
}): Consent {
  const idx = consentStore.findIndex((c) => c.id === input.id)
  if (idx === -1) throw new Error("Consent not found")

  const current = consentStore[idx]
  const nextScopes = input.scopes ?? current.scopes
  const nextExpires = input.expiresAt !== undefined ? input.expiresAt : current.expires_at

  const updated: Consent = {
    ...current,
    scopes: nextScopes,
    expires_at: nextExpires,
    updated_at: nowIso(),
  }

  if (
    input.scopes &&
    input.scopes.join("|") !== current.scopes.join("|")
  ) {
    const entry: ConsentAuditEntry = {
      id: `audit-${Date.now()}`,
      actorId: input.actorId,
      actorRole: input.actorRole,
      beforeScopes: current.scopes,
      afterScopes: input.scopes,
      createdAt: updated.updated_at,
    }
    updated.audit = [...(current.audit ?? []), entry]
  }

  consentStore[idx] = updated
  return normalizeConsent({ ...updated })
}

export function revokeConsent(input: {
  id: string
  actorId: string
  actorRole: Role
}): Consent {
  const idx = consentStore.findIndex((c) => c.id === input.id)
  if (idx === -1) throw new Error("Consent not found")

  const updated: Consent = {
    ...consentStore[idx],
    status: "REVOKED",
    revoked_at: nowIso(),
    updated_at: nowIso(),
  }
  const entry: ConsentAuditEntry = {
    id: `audit-${Date.now()}`,
    actorId: input.actorId,
    actorRole: input.actorRole,
    beforeScopes: updated.scopes,
    afterScopes: updated.scopes,
    createdAt: updated.updated_at,
  }
  updated.audit = [...(updated.audit ?? []), entry]
  consentStore[idx] = updated
  return { ...updated }
}

export function isConsentActive(consent: Consent): boolean {
  const normalized = normalizeConsent({ ...consent })
  return normalized.status === "ACTIVE"
}

export function renewConsent(input: {
  id: string
  actorId: string
  actorRole: Role
  days?: number
}): Consent {
  const idx = consentStore.findIndex((c) => c.id === input.id)
  if (idx === -1) throw new Error("Consent not found")

  const current = consentStore[idx]
  const days = input.days ?? 30
  const now = new Date()
  const currentExpiry = current.expires_at ? new Date(current.expires_at) : now
  const baseDate = currentExpiry > now ? currentExpiry : now
  const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000)

  const updated: Consent = {
    ...current,
    expires_at: newExpiry.toISOString(),
    updated_at: nowIso(),
  }

  const entry: ConsentAuditEntry = {
    id: `audit-${Date.now()}`,
    actorId: input.actorId,
    actorRole: input.actorRole,
    beforeScopes: current.scopes,
    afterScopes: current.scopes,
    createdAt: updated.updated_at,
  }
  updated.audit = [...(current.audit ?? []), entry]

  consentStore[idx] = updated
  return normalizeConsent({ ...updated })
}

export function hideConsent(id: string): Consent {
  const idx = consentStore.findIndex((c) => c.id === id)
  if (idx === -1) throw new Error("Consent not found")

  const updated: Consent = {
    ...consentStore[idx],
    hidden_by_client: true,
    updated_at: nowIso(),
  }
  consentStore[idx] = updated
  return { ...updated }
}

export function restoreConsent(id: string): Consent {
  const idx = consentStore.findIndex((c) => c.id === id)
  if (idx === -1) throw new Error("Consent not found")

  const updated: Consent = {
    ...consentStore[idx],
    hidden_by_client: false,
    updated_at: nowIso(),
  }
  consentStore[idx] = updated
  return { ...updated }
}

