import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { getCompetitiveXpSummary } from "@/lib/client-dashboard"

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse
  }

  try {
    const supabase = await createClient(request)
    const summary = await getCompetitiveXpSummary(supabase, sessionOrResponse.userId)

    return NextResponse.json(summary)
  } catch (error) {
    console.error("GET /api/client/progress/xp unexpected error:", error)
    return NextResponse.json({ error: "Error al obtener XP competitivo." }, { status: 500 })
  }
}
