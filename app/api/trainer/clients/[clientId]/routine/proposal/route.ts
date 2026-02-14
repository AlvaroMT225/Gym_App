import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { requireActiveConsent, requireConsentScope } from "@/lib/consent-guards"
import { routineProposals } from "@/lib/trainer-data"

export async function PUT(
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

  const scopeResult = requireConsentScope(consentResult.consent, "routines:write")
  if ("error" in scopeResult) return scopeResult.error

  const body = await request.json()
  const title = String(body.title || "Rutina propuesta")
  const weeks = Number(body.weeks || 4)
  const progression = String(body.progression || "")
  const exercises = Array.isArray(body.exercises) ? body.exercises : []

  const proposal = {
    id: routineProposals[clientId]?.id ?? `r-prop-${Date.now()}`,
    title,
    weeks,
    progression,
    exercises: exercises.map((ex: { id: string; name: string; sets: number; reps: number; restSec: number; notes?: string }) => ({
      id: String(ex.id || `ex-${Date.now()}`),
      name: String(ex.name || "Ejercicio"),
      sets: Number(ex.sets || 3),
      reps: Number(ex.reps || 10),
      restSec: Number(ex.restSec || 60),
      notes: ex.notes ? String(ex.notes) : undefined,
    })),
    updatedAt: new Date().toISOString(),
  }

  routineProposals[clientId] = proposal

  return NextResponse.json({ proposal })
}
