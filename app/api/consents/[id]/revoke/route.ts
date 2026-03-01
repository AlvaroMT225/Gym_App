import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { getConsentById, revokeConsent, formatConsentForFrontend } from "@/lib/supabase/consent-queries"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse
  try {
    const consent = await getConsentById(id)
    if (!consent || consent.athlete_id !== sessionOrResponse.userId) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    }
    const row = await revokeConsent(id)
    return NextResponse.json({ consent: formatConsentForFrontend(row) })
  } catch {
    return NextResponse.json({ error: "Error al revocar" }, { status: 500 })
  }
}
