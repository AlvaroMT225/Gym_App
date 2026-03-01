import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

interface AthleteRef {
  id: string
  first_name: string | null
  last_name: string | null
}

function normalizeAthlete(raw: unknown): AthleteRef | null {
  if (!raw) return null
  if (Array.isArray(raw)) return (raw[0] as AthleteRef) ?? null
  return raw as AthleteRef
}

function athleteName(a: AthleteRef): string {
  return `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || a.id
}

function athleteAvatar(a: AthleteRef): string {
  const f = (a.first_name ?? "?")[0]?.toUpperCase() ?? "?"
  const l = (a.last_name ?? "?")[0]?.toUpperCase() ?? "?"
  return `${f}${l}`
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const coachId = sessionOrResponse.userId

  try {
    const supabase = await createClient()

    const [
      { data: consentsData, error: consentsError },
      { data: proposalsData, error: proposalsError },
    ] = await Promise.all([
      supabase
        .from("consents")
        .select("id, expires_at, athlete:profiles!athlete_id(id, first_name, last_name)")
        .eq("coach_id", coachId)
        .eq("status", "active"),
      supabase
        .from("proposals")
        .select("id, title, athlete:profiles!athlete_id(id, first_name, last_name)")
        .eq("coach_id", coachId)
        .eq("type", "routine")
        .eq("status", "sent"),
    ])

    if (consentsError) {
      console.error("GET /api/trainer/alerts consents error:", consentsError)
      return NextResponse.json({ error: "Error al obtener alertas" }, { status: 500 })
    }

    if (proposalsError) {
      console.error("GET /api/trainer/alerts proposals error:", proposalsError)
      return NextResponse.json({ error: "Error al obtener alertas" }, { status: 500 })
    }

    const now = new Date()
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    type AlertSeverity = "error" | "warning" | "info"
    type AlertEntry = {
      id: string
      type: "consent_expiring" | "consent_expired" | "proposal_pending" | "low_streak"
      severity: AlertSeverity
      clientId: string
      clientName: string
      clientAvatar: string
      message: string
      href: string
    }

    const alerts: AlertEntry[] = []

    // Consent expiry alerts
    for (const consent of consentsData ?? []) {
      if (!consent.expires_at) continue

      const athlete = normalizeAthlete(consent.athlete)
      if (!athlete) continue

      const name = athleteName(athlete)
      const avatar = athleteAvatar(athlete)
      const expiresAt = new Date(consent.expires_at)
      const href = `/trainer/clients/${athlete.id}`

      if (expiresAt <= now) {
        alerts.push({
          id: `expired-${consent.id}`,
          type: "consent_expired",
          severity: "error",
          clientId: athlete.id,
          clientName: name,
          clientAvatar: avatar,
          message: `El consentimiento de ${name} ha expirado.`,
          href,
        })
      } else if (expiresAt <= weekFromNow) {
        const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        alerts.push({
          id: `expiring-${consent.id}`,
          type: "consent_expiring",
          severity: "warning",
          clientId: athlete.id,
          clientName: name,
          clientAvatar: avatar,
          message: `El consentimiento de ${name} vence en ${daysLeft} día${daysLeft !== 1 ? "s" : ""}.`,
          href,
        })
      }
    }

    // Pending proposal alerts
    for (const proposal of proposalsData ?? []) {
      const athlete = normalizeAthlete(proposal.athlete)
      if (!athlete) continue

      const name = athleteName(athlete)
      alerts.push({
        id: `proposal-${proposal.id}`,
        type: "proposal_pending",
        severity: "info",
        clientId: athlete.id,
        clientName: name,
        clientAvatar: athleteAvatar(athlete),
        message: `Propuesta "${proposal.title}" para ${name} sin respuesta.`,
        href: `/trainer/clients/${athlete.id}`,
      })
    }

    // Sort: errors first, then warnings, then info
    const severityOrder: Record<AlertSeverity, number> = { error: 0, warning: 1, info: 2 }
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    return NextResponse.json({ alerts })
  } catch (err) {
    console.error("GET /api/trainer/alerts unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
