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
    const athleteId = sessionOrResponse.userId

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", athleteId)
      .maybeSingle()

    if (profileError) {
      console.error("GET /api/client/progress/xp profile error:", profileError)
      return NextResponse.json({ error: "No se pudo obtener el perfil del atleta." }, { status: 500 })
    }

    if (!profile?.gym_id) {
      return NextResponse.json({ error: "El atleta no tiene gimnasio asignado." }, { status: 404 })
    }

    const summary = await getCompetitiveXpSummary(supabase, athleteId, profile.gym_id)
    return NextResponse.json(summary)
  } catch (error) {
    console.error("GET /api/client/progress/xp unexpected error:", error)
    return NextResponse.json({ error: "Error al obtener XP competitivo." }, { status: 500 })
  }
}
