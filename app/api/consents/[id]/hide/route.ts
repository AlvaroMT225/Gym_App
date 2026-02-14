import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { hideConsent } from "@/lib/consents"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const consent = hideConsent(id)
    return NextResponse.json({ consent })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al ocultar consentimiento" },
      { status: 400 }
    )
  }
}
