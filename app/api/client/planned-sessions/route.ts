import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { listConsentsForClient } from "@/lib/consents"
import { listPlannedSessionsForClient } from "@/lib/planned-sessions"
import { exerciseCatalog } from "@/lib/trainer-data"

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const clientId = sessionOrResponse.userId
  const consents = listConsentsForClient(clientId).filter((c) => c.status === "ACTIVE")

  // Aggregate planned sessions from all trainers with active consent
  const allSessions: any[] = []

  for (const consent of consents) {
    if (!consent.scopes.includes("sessions:read")) continue
    const sessions = listPlannedSessionsForClient(clientId)
    allSessions.push(...sessions)
  }

  // Enrich with exercise names
  const enriched = allSessions.map((ps) => ({
    ...ps,
    items: ps.items.map((item) => {
      const ex = exerciseCatalog.find((e) => e.id === item.exerciseId)
      return {
        ...item,
        exerciseName: ex?.name ?? item.exerciseId,
      }
    }),
  }))

  return NextResponse.json({ sessions: enriched })
}
