import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { requireActiveConsent, requireConsentScope } from "@/lib/consent-guards"
import {
  getExerciseById,
  listCommentsForSession,
  listSessionsForClient,
} from "@/lib/trainer-data"

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

  const { searchParams } = request.nextUrl
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const exercise = searchParams.get("exercise")?.toLowerCase() || ""
  const muscle = searchParams.get("muscle")?.toLowerCase() || ""

  let sessions = listSessionsForClient(clientId)

  if (from) {
    const fromTime = new Date(from).getTime()
    sessions = sessions.filter((s) => new Date(s.date).getTime() >= fromTime)
  }
  if (to) {
    const toTime = new Date(to).getTime()
    sessions = sessions.filter((s) => new Date(s.date).getTime() <= toTime)
  }
  if (exercise) {
    sessions = sessions.filter((s) => {
      const ex = getExerciseById(s.exerciseId)
      return (
        s.exerciseId.toLowerCase().includes(exercise) ||
        (ex?.name.toLowerCase().includes(exercise) ?? false)
      )
    })
  }
  if (muscle) {
    sessions = sessions.filter((s) => {
      const ex = getExerciseById(s.exerciseId)
      return ex?.muscles.some((m) => m.toLowerCase().includes(muscle)) ?? false
    })
  }

  const metrics = sessions.reduce(
    (acc, session) => {
      session.sets.forEach((set) => {
        acc.totalVolume += set.weight * set.reps
        acc.totalReps += set.reps
        acc.totalRpe += set.rpe
        acc.totalSets += 1
      })
      return acc
    },
    { totalVolume: 0, totalReps: 0, totalRpe: 0, totalSets: 0 }
  )

  const responseSessions = sessions.map((s) => {
    const exerciseInfo = getExerciseById(s.exerciseId)
    return {
      id: s.id,
      date: s.date,
      source: s.source,
      exercise: exerciseInfo
        ? {
            id: exerciseInfo.id,
            name: exerciseInfo.name,
            muscles: exerciseInfo.muscles,
            machine: exerciseInfo.machine,
          }
        : { id: s.exerciseId, name: s.exerciseId, muscles: [], machine: "" },
      sets: s.sets,
      comments: listCommentsForSession(s.id),
    }
  })

  return NextResponse.json({
    sessions: responseSessions,
    metrics: {
      totalVolume: metrics.totalVolume,
      totalReps: metrics.totalReps,
      avgRpe: metrics.totalSets ? metrics.totalRpe / metrics.totalSets : 0,
    },
  })
}

