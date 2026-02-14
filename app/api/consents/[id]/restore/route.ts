import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { restoreConsent } from "@/lib/consents"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const consent = restoreConsent(id)
    return NextResponse.json({ consent })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al restaurar consentimiento" },
      { status: 400 }
    )
  }
}
