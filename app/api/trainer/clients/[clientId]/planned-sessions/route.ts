import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { requireActiveConsent, requireConsentScope } from "@/lib/consent-guards"
import { listPlannedSessionsForClient, createPlannedSession } from "@/lib/planned-sessions"
import { exerciseCatalog } from "@/lib/trainer-data"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const consentResult = requireActiveConsent({
    trainerId: sessionOrResponse.userId,
    clientId,
  })
  if ("error" in consentResult) return consentResult.error

  const scopeResult = requireConsentScope(consentResult.consent, "sessions:read")
  if ("error" in scopeResult) return scopeResult.error

  const sessions = listPlannedSessionsForClient(clientId)

  // Enrich with exercise details
  const enriched = sessions.map((ps) => ({
    ...ps,
    items: ps.items.map((item) => {
      const ex = exerciseCatalog.find((e) => e.id === item.exerciseId)
      return {
        ...item,
        exerciseName: ex?.name ?? item.exerciseId,
        exerciseMuscles: ex?.muscles ?? [],
      }
    }),
  }))

  return NextResponse.json({ sessions: enriched })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const consentResult = requireActiveConsent({
    trainerId: sessionOrResponse.userId,
    clientId,
  })
  if ("error" in consentResult) return consentResult.error

  const scopeResult = requireConsentScope(consentResult.consent, "sessions:write")
  if ("error" in scopeResult) return scopeResult.error

  const body = await request.json()

  const newSession = createPlannedSession({
    clientId,
    trainerId: sessionOrResponse.userId,
    title: String(body.title || "Sesión sugerida"),
    description: body.description ? String(body.description) : undefined,
    scheduledAt: body.scheduledAt ?? null,
    items: Array.isArray(body.items) ? body.items : [],
    status: body.status === "DRAFT" ? "DRAFT" : "PROPOSED",
    changelog: [body.changelogEntry || "Versión inicial"],
  })

  return NextResponse.json({ session: newSession }, { status: 201 })
}
