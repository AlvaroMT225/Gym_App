import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { requireActiveConsent, requireConsentScope } from "@/lib/consent-guards"
import { createClient } from "@/lib/supabase/server"
import { handleApiError, validateBody } from "@/lib/api-utils"
import { routineProposalBodySchema } from "@/lib/validations/trainer"

export async function PUT(
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

    const raw = await validateBody(request, routineProposalBodySchema)
    const title = (raw.title ?? "Rutina propuesta").trim()
    const weeks = Number(raw.weeks ?? 4)
    const progression = String(raw.progression ?? "")
    const exercises = raw.exercises ?? []

    if (!title) {
      return NextResponse.json({ error: "El título es requerido" }, { status: 400 })
    }

    const content = { weeks, progression, exercises }
    const now = new Date().toISOString()

    // Check for existing open proposal (draft or sent) for this coach+athlete+type
    const { data: existing, error: existingError } = await supabase
      .from("proposals")
      .select("id, version")
      .eq("coach_id", coachId)
      .eq("athlete_id", clientId)
      .eq("type", "routine")
      .in("status", ["draft", "sent"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingError) {
      console.error("PUT .../routine/proposal existing query error:", existingError)
      return NextResponse.json({ error: "Error al verificar propuesta existente" }, { status: 500 })
    }

    let proposal: { id: string; title: string; status: string; content: unknown; updated_at: string }

    if (existing) {
      const { data, error } = await supabase
        .from("proposals")
        .update({ title, content, status: "sent", sent_at: now })
        .eq("id", existing.id)
        .select("id, title, status, content, updated_at")
        .single()

      if (error || !data) {
        console.error("PUT .../routine/proposal update error:", error)
        return NextResponse.json({ error: "Error al actualizar propuesta" }, { status: 500 })
      }
      proposal = data as typeof proposal
    } else {
      const { data, error } = await supabase
        .from("proposals")
        .insert({
          coach_id: coachId,
          athlete_id: clientId,
          type: "routine",
          status: "sent",
          title,
          content,
          sent_at: now,
        })
        .select("id, title, status, content, updated_at")
        .single()

      if (error || !data) {
        console.error("PUT .../routine/proposal insert error:", error)
        return NextResponse.json({ error: "Error al crear propuesta" }, { status: 500 })
      }
      proposal = data as typeof proposal
    }

    const c = (proposal.content ?? {}) as Record<string, unknown>
    return NextResponse.json({
      proposal: {
        id: proposal.id,
        title: proposal.title,
        updatedAt: proposal.updated_at,
        weeks: (c.weeks as number) ?? 0,
        progression: (c.progression as string) ?? "",
        exercises: (c.exercises as unknown[]) ?? [],
      },
    })
  } catch (err) {
    console.error("PUT .../routine/proposal unexpected error:", err)
    return handleApiError(err)
  }
}
