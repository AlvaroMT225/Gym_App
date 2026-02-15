import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { listActiveConsentsForTrainer, listConsentsForClient } from "@/lib/consents"
import { routineProposals, getClientById } from "@/lib/trainer-data"

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const trainerId = sessionOrResponse.userId
  const consents = listActiveConsentsForTrainer(trainerId)
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const alerts: Array<{
    id: string
    type: "consent_expiring" | "consent_expired" | "proposal_pending" | "low_streak"
    severity: "warning" | "error" | "info"
    clientId: string
    clientName: string
    clientAvatar: string
    message: string
    href: string
  }> = []

  // Check consent expiring / expired
  for (const consent of consents) {
    const client = getClientById(consent.client_id)
    const clientName = client?.name || consent.client_id
    const clientAvatar = client?.avatar || "??"

    if (consent.expires_at) {
      const expiry = new Date(consent.expires_at)
      if (expiry <= now) {
        alerts.push({
          id: `alert-expired-${consent.id}`,
          type: "consent_expired",
          severity: "error",
          clientId: consent.client_id,
          clientName,
          clientAvatar,
          message: `Consentimiento expirado`,
          href: `/trainer/clients/${consent.client_id}`,
        })
      } else if (expiry <= sevenDaysFromNow) {
        const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        alerts.push({
          id: `alert-expiring-${consent.id}`,
          type: "consent_expiring",
          severity: "warning",
          clientId: consent.client_id,
          clientName,
          clientAvatar,
          message: `Consentimiento vence en ${daysLeft} día${daysLeft !== 1 ? "s" : ""}`,
          href: `/trainer/clients/${consent.client_id}`,
        })
      }
    }
  }

  // Check pending proposals
  for (const consent of consents) {
    const proposal = routineProposals[consent.client_id]
    if (proposal && proposal.status === "proposal") {
      const client = getClientById(consent.client_id)
      alerts.push({
        id: `alert-proposal-${proposal.id}`,
        type: "proposal_pending",
        severity: "info",
        clientId: consent.client_id,
        clientName: client?.name || consent.client_id,
        clientAvatar: client?.avatar || "??",
        message: `Propuesta "${proposal.title}" sin respuesta`,
        href: `/trainer/clients/${consent.client_id}`,
      })
    }
  }

  // Sort: errors first, then warnings, then info
  const severityOrder = { error: 0, warning: 1, info: 2 }
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return NextResponse.json({ alerts })
}
