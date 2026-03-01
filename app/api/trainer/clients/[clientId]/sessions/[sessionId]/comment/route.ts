import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { requireActiveConsent, requireConsentScope } from "@/lib/consent-guards"
import { createClient } from "@/lib/supabase/server"
import { handleApiError, validateBody } from "@/lib/api-utils"
import { commentBodySchema } from "@/lib/validations/trainer"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string; sessionId: string }> }
) {
  const { clientId, sessionId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const coachId = sessionOrResponse.userId

  try {
    const { comment } = await validateBody(request, commentBodySchema)

    const supabase = await createClient()

    const consentResult = await requireActiveConsent(supabase, coachId, clientId)
    if ("error" in consentResult) return consentResult.error

    const scopeResult = requireConsentScope(consentResult.consent, "view_progress")
    if ("error" in scopeResult) return scopeResult.error

    // Verify session exists and belongs to the athlete
    const { data: sessionRow, error: sessionError } = await supabase
      .from("workout_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("profile_id", clientId)
      .single()

    if (sessionError || !sessionRow) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
    }

    // INSERT comment
    const { data: inserted, error: insertError } = await supabase
      .from("session_comments")
      .insert({
        session_id: sessionId,
        coach_id: coachId,
        athlete_id: clientId,
        content: comment,
      })
      .select("id, content, created_at")
      .single()

    if (insertError || !inserted) {
      console.error("POST /api/trainer/clients/[clientId]/sessions/[sessionId]/comment insert error:", insertError)
      return NextResponse.json({ error: "Error al guardar comentario" }, { status: 500 })
    }

    return NextResponse.json({
      comment: {
        id: inserted.id,
        comment: inserted.content,
        createdAt: inserted.created_at,
      },
    })
  } catch (err) {
    console.error("POST /api/trainer/clients/[clientId]/sessions/[sessionId]/comment unexpected error:", err)
    return handleApiError(err)
  }
}
