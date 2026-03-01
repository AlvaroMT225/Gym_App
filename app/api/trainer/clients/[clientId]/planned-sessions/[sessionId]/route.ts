import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { requireActiveConsent, requireConsentScope } from "@/lib/consent-guards"
import { createClient } from "@/lib/supabase/server"
import { handleApiError, validateBody } from "@/lib/api-utils"
import { plannedSessionBodySchema } from "@/lib/validations/trainer"

/* ---------- types ---------- */

interface PlannedSessionRow {
  id: string
  title: string
  description: string
  scheduled_at: string | null
  status: string
  content: unknown[]
  version: number
  changelog: string
  created_at: string
  updated_at: string
}

/* ---------- helpers ---------- */

function parseChangelog(val: string | null): string[] {
  if (!val) return []
  try {
    const parsed = JSON.parse(val)
    if (Array.isArray(parsed)) return parsed
  } catch {}
  return [val]
}

function mapSession(row: PlannedSessionRow) {
  const items = (row.content ?? []) as Record<string, unknown>[]
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    scheduledAt: row.scheduled_at,
    status: row.status,
    version: row.version,
    items: items.map((item) => ({
      ...item,
      exerciseName:
        (item.exerciseName as string) ??
        (item.exerciseId as string) ??
        "Ejercicio",
    })),
    changelog: parseChangelog(row.changelog),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/* ---------- GET — session detail ---------- */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string; sessionId: string }> }
) {
  const { clientId, sessionId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const coachId = sessionOrResponse.userId

  try {
    const supabase = await createClient()

    const consentResult = await requireActiveConsent(supabase, coachId, clientId)
    if ("error" in consentResult) return consentResult.error

    const scopeResult = requireConsentScope(consentResult.consent, "view_progress")
    if ("error" in scopeResult) return scopeResult.error

    const { data, error } = await supabase
      .from("planned_sessions")
      .select(
        "id, title, description, scheduled_at, status, content, version, changelog, created_at, updated_at"
      )
      .eq("id", sessionId)
      .eq("coach_id", coachId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
    }

    return NextResponse.json({ session: mapSession(data as PlannedSessionRow) })
  } catch (err) {
    console.error("GET .../planned-sessions/[sessionId] unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

/* ---------- PUT — update planned session ---------- */

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string; sessionId: string }> }
) {
  const { clientId, sessionId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const coachId = sessionOrResponse.userId

  try {
    const supabase = await createClient()

    const consentResult = await requireActiveConsent(supabase, coachId, clientId)
    if ("error" in consentResult) return consentResult.error

    const scopeResult = requireConsentScope(consentResult.consent, "manage_routines")
    if ("error" in scopeResult) return scopeResult.error

    // Fetch current row to get version and existing changelog
    const { data: existing, error: findError } = await supabase
      .from("planned_sessions")
      .select("id, version, changelog")
      .eq("id", sessionId)
      .eq("coach_id", coachId)
      .single()

    if (findError || !existing) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
    }

    const { title, description, scheduledAt, items, changelogEntry: bodyEntry } = await validateBody(request, plannedSessionBodySchema)

    // Append new entry to changelog array
    const currentChangelog = parseChangelog((existing as { version: number; changelog: string }).changelog)
    const changelogEntry = (bodyEntry ?? "Actualización").trim()
    if (changelogEntry) currentChangelog.push(changelogEntry)

    const { data, error } = await supabase
      .from("planned_sessions")
      .update({
        title,
        description: description ? description.trim() : "",
        scheduled_at: scheduledAt ?? null,
        content: items ?? [],
        version: ((existing as { version: number }).version ?? 1) + 1,
        changelog: JSON.stringify(currentChangelog),
      })
      .eq("id", sessionId)
      .eq("coach_id", coachId)
      .select(
        "id, title, description, scheduled_at, status, content, version, changelog, created_at, updated_at"
      )
      .single()

    if (error || !data) {
      console.error("PUT .../planned-sessions/[sessionId] update error:", error)
      return NextResponse.json({ error: "Error al actualizar" }, { status: 500 })
    }

    return NextResponse.json({ session: mapSession(data as PlannedSessionRow) })
  } catch (err) {
    console.error("PUT .../planned-sessions/[sessionId] unexpected error:", err)
    return handleApiError(err)
  }
}

/* ---------- DELETE — remove planned session ---------- */

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string; sessionId: string }> }
) {
  const { clientId, sessionId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const coachId = sessionOrResponse.userId

  try {
    const supabase = await createClient()

    const consentResult = await requireActiveConsent(supabase, coachId, clientId)
    if ("error" in consentResult) return consentResult.error

    const scopeResult = requireConsentScope(consentResult.consent, "manage_routines")
    if ("error" in scopeResult) return scopeResult.error

    // Verify existence before deleting
    const { data: existing, error: findError } = await supabase
      .from("planned_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("coach_id", coachId)
      .maybeSingle()

    if (findError) {
      console.error("DELETE .../planned-sessions/[sessionId] find error:", findError)
      return NextResponse.json({ error: "Error al buscar sesión" }, { status: 500 })
    }

    if (!existing) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
    }

    const { error: deleteError } = await supabase
      .from("planned_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("coach_id", coachId)

    if (deleteError) {
      console.error("DELETE .../planned-sessions/[sessionId] delete error:", deleteError)
      return NextResponse.json({ error: "Error al eliminar" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("DELETE .../planned-sessions/[sessionId] unexpected error:", err)
    return handleApiError(err)
  }
}
