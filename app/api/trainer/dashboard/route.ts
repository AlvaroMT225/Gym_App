import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { listActiveConsentsForTrainer } from "@/lib/consents"
import { routineProposals, sessionComments, getClientById } from "@/lib/trainer-data"
import { listPlannedSessionsForTrainer } from "@/lib/planned-sessions"

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const trainerId = sessionOrResponse.userId
  const consents = listActiveConsentsForTrainer(trainerId)
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const clientCount = consents.length

  // Count pending proposals
  let pendingProposals = 0
  for (const consent of consents) {
    const proposal = routineProposals[consent.client_id]
    if (proposal && proposal.status === "proposal") {
      pendingProposals++
    }
  }

  // Count expiring consents (within 7 days)
  const expiringConsents = consents.filter((c) => {
    if (!c.expires_at) return false
    const expiry = new Date(c.expires_at)
    return expiry <= sevenDaysFromNow && expiry > now
  }).length

  // Count planned sessions this week
  const allPlanned = listPlannedSessionsForTrainer(trainerId)
  const weekStart = new Date(now)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
  const plannedThisWeek = allPlanned.filter((ps) => {
    if (!ps.scheduledAt) return false
    const d = new Date(ps.scheduledAt)
    return d >= weekStart && d < weekEnd
  }).length

  // Recent activity: last 5 comments
  const recentActivity = sessionComments
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map((c) => {
      const client = getClientById(c.clientId)
      return {
        type: "comment" as const,
        clientName: client?.name || c.clientId,
        clientAvatar: client?.avatar || "??",
        message: c.comment,
        date: c.createdAt,
      }
    })

  return NextResponse.json({
    clientCount,
    pendingProposals,
    expiringConsents,
    plannedThisWeek,
    recentActivity,
  })
}
