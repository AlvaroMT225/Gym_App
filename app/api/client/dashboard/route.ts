import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { getCompetitiveDashboardSummary } from "@/lib/client-dashboard"

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
      console.error("GET /api/client/dashboard profile error:", profileError)
      return NextResponse.json({ error: "No se pudo obtener el perfil del atleta." }, { status: 500 })
    }

    if (!profile?.gym_id) {
      return NextResponse.json({ error: "El atleta no tiene gimnasio asignado." }, { status: 404 })
    }

    const summary = await getCompetitiveDashboardSummary({
      supabase,
      athleteId,
      gymId: profile.gym_id,
    })

    return NextResponse.json(summary)
  } catch (error) {
    console.error("GET /api/client/dashboard unexpected error:", error)
    return NextResponse.json({ error: "Error al obtener el dashboard competitivo." }, { status: 500 })
  }
}
