import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const coachId = sessionOrResponse.userId

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("consents")
      .select("id, scope, expires_at, status, athlete:athlete_id(id, first_name, last_name, avatar_url, created_at)")
      .eq("coach_id", coachId)
      .eq("athlete_id", clientId)
      .eq("status", "active")
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Consentimiento invalido" }, { status: 403 })
    }

    const athlete = Array.isArray(data.athlete) ? data.athlete[0] : data.athlete
    const firstName: string = (athlete as { first_name?: string } | null)?.first_name ?? ""
    const lastName: string = (athlete as { last_name?: string } | null)?.last_name ?? ""
    const athleteId: string = (athlete as { id?: string } | null)?.id ?? ""
    const createdAt: string = (athlete as { created_at?: string } | null)?.created_at ?? ""

    return NextResponse.json({
      client: {
        id: athleteId,
        name: `${firstName} ${lastName}`.trim() || "Atleta",
        alias: lastName ? `${firstName} ${lastName.charAt(0)}.` : firstName,
        avatar: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "?",
        memberSince: createdAt,
        goal: "",
      },
      consent: {
        id: data.id,
        status: data.status,
        scope: data.scope,
        expires_at: data.expires_at,
      },
    })
  } catch (err) {
    console.error("GET /api/trainer/clients/[clientId]/summary unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
