import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { hideConsent, formatConsentForFrontend } from "@/lib/supabase/consent-queries"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse
  try {
    const row = await hideConsent((await params).id)
    return NextResponse.json({ consent: formatConsentForFrontend(row) })
  } catch {
    return NextResponse.json({ error: "Error al ocultar consentimiento" }, { status: 400 })
  }
}
