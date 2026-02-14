import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { CONSENT_SCOPES, createConsent, listConsentsForClient } from "@/lib/consents"
import { trainers, getTrainerById } from "@/lib/trainer-data"

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const consents = listConsentsForClient(sessionOrResponse.userId).map((c) => ({
    ...c,
    trainer: getTrainerById(c.trainer_id) ?? null,
  }))

  return NextResponse.json({ consents })
}

export async function POST(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const body = await request.json()
    const trainerId = String(body.trainerId || "")
    const scopes = Array.isArray(body.scopes)
      ? body.scopes.filter((s: string) => CONSENT_SCOPES.includes(s))
      : []
    const expiresAt =
      body.expiresAt === null || body.expiresAt === undefined ? null : String(body.expiresAt)

    if (!trainerId || !trainers.some((t) => t.id === trainerId)) {
      return NextResponse.json({ error: "Entrenador invalido" }, { status: 400 })
    }
    if (scopes.length === 0) {
      return NextResponse.json({ error: "Selecciona al menos un scope" }, { status: 400 })
    }

    const consent = createConsent({
      clientId: sessionOrResponse.userId,
      trainerId,
      scopes,
      expiresAt,
    })

    return NextResponse.json({ consent })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al crear consentimiento" },
      { status: 400 }
    )
  }
}

