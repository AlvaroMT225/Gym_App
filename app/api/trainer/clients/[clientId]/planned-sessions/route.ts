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

/* ---------- GET — list planned sessions ---------- */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
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
      .eq("coach_id", coachId)
      .eq("athlete_id", clientId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("GET .../planned-sessions query error:", error)
      return NextResponse.json({ error: "Error al obtener sesiones sugeridas" }, { status: 500 })
    }

    const sessions = ((data ?? []) as PlannedSessionRow[]).map(mapSession)
    return NextResponse.json({ sessions })
  } catch (err) {
    console.error("GET .../planned-sessions unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

/* ---------- POST — create planned session ---------- */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const coachId = sessionOrResponse.userId

  try {
    const supabase = await createClient()

    const consentResult = await requireActiveConsent(supabase, coachId, clientId)
    if ("error" in consentResult) return consentResult.error

    const scopeResult = requireConsentScope(consentResult.consent, "manage_routines")
    if ("error" in scopeResult) return scopeResult.error

    const { title, description, scheduledAt, items: bodyItems, changelogEntry: bodyEntry } = await validateBody(request, plannedSessionBodySchema)

    const items = bodyItems ?? []
    const changelogEntry = (bodyEntry ?? "Versión inicial").trim()
    const changelog = JSON.stringify(changelogEntry ? [changelogEntry] : [])

    const { data, error } = await supabase
      .from("planned_sessions")
      .insert({
        coach_id: coachId,
        athlete_id: clientId,
        title,
        description: description ? description.trim() : "",
        scheduled_at: scheduledAt ?? null,
        status: "sent",
        content: items,
        version: 1,
        changelog,
      })
      .select(
        "id, title, description, scheduled_at, status, content, version, changelog, created_at, updated_at"
      )
      .single()

    if (error || !data) {
      console.error("POST .../planned-sessions insert error:", error)
      return NextResponse.json({ error: "Error al crear sesión sugerida" }, { status: 500 })
    }

    return NextResponse.json(
      { session: mapSession(data as PlannedSessionRow) },
      { status: 201 }
    )
  } catch (err) {
    console.error("POST .../planned-sessions unexpected error:", err)
    return handleApiError(err)
  }
}
