import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { requireActiveConsent, requireConsentScope } from "@/lib/consent-guards"
import { getExerciseById, listSessionsForClient } from "@/lib/trainer-data"

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

  const scopeResult = requireConsentScope(consentResult.consent, "prs:read")
  if ("error" in scopeResult) return scopeResult.error

  const sessions = listSessionsForClient(clientId)
  const prMap = new Map<string, { bestWeight: number; date: string }>()

  sessions.forEach((session) => {
    const bestSet = session.sets.reduce(
      (best, set) => (set.weight > best.weight ? set : best),
      session.sets[0]
    )
    const current = prMap.get(session.exerciseId)
    if (!current || bestSet.weight > current.bestWeight) {
      prMap.set(session.exerciseId, { bestWeight: bestSet.weight, date: session.date })
    }
  })

  const prs = Array.from(prMap.entries()).map(([exerciseId, data]) => {
    const exercise = getExerciseById(exerciseId)
    return {
      exerciseId,
      exerciseName: exercise?.name ?? exerciseId,
      bestWeight: data.bestWeight,
      date: data.date,
    }
  })

  return NextResponse.json({ prs })
}

