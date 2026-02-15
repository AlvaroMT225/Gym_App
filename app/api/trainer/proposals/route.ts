import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { listActiveConsentsForTrainer, listConsentsForClient } from "@/lib/consents"
import { routineProposals, getClientById } from "@/lib/trainer-data"
import { listPlannedSessionsForClient } from "@/lib/planned-sessions"

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const trainerId = sessionOrResponse.userId
  const activeConsents = listActiveConsentsForTrainer(trainerId)
  const clientIds = activeConsents.map((c) => c.client_id)

  // Also check all consents (not just active) to find rejected/accepted proposals
  const allClientIds = new Set<string>()
  for (const consent of activeConsents) {
    allClientIds.add(consent.client_id)
  }

  const proposals: Array<{
    id: string
    type: "routine" | "session"
    title: string
    status: string
    clientId: string
    clientName: string
    clientAvatar: string
    date: string
    version: number
    changelog: string[]
  }> = []

  // Routine proposals
  for (const clientId of clientIds) {
    const proposal = routineProposals[clientId]
    if (proposal) {
      const client = getClientById(clientId)
      proposals.push({
        id: proposal.id,
        type: "routine",
        title: proposal.title,
        status: proposal.status,
        clientId,
        clientName: client?.name || clientId,
        clientAvatar: client?.avatar || "??",
        date: proposal.updatedAt,
        version: proposal.version,
        changelog: proposal.changelog,
      })
    }
  }

  // Planned session proposals
  for (const clientId of clientIds) {
    const sessions = listPlannedSessionsForClient(clientId)
    for (const session of sessions) {
      if (session.trainerId !== trainerId) continue
      const client = getClientById(clientId)
      proposals.push({
        id: session.id,
        type: "session",
        title: session.title,
        status: session.status === "PROPOSED" ? "proposal" : "draft",
        clientId,
        clientName: client?.name || clientId,
        clientAvatar: client?.avatar || "??",
        date: session.updatedAt,
        version: session.version,
        changelog: session.changelog,
      })
    }
  }

  // Sort by date descending
  proposals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return NextResponse.json({ proposals })
}
