import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { paginationParams } from "@/lib/api-utils"

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const coachId = sessionOrResponse.userId

  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const { limit, offset } = paginationParams(searchParams)

    const { data: consents, count, error } = await supabase
      .from("consents")
      .select(
        "id, scope, expires_at, status, athlete:athlete_id(id, first_name, last_name, avatar_url, created_at)",
        { count: "exact", head: false }
      )
      .eq("coach_id", coachId)
      .eq("status", "active")
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("GET /api/trainer/clients error:", error)
      return NextResponse.json({ error: "Error al obtener atletas" }, { status: 500 })
    }

    const clients = (consents ?? []).map((consent) => {
      const athlete = Array.isArray(consent.athlete) ? consent.athlete[0] : consent.athlete
      const firstName: string = (athlete as { first_name?: string } | null)?.first_name ?? ""
      const lastName: string = (athlete as { last_name?: string } | null)?.last_name ?? ""
      const athleteId: string = (athlete as { id?: string } | null)?.id ?? ""
      const createdAt: string = (athlete as { created_at?: string } | null)?.created_at ?? ""

      const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "?"
      const fullName = `${firstName} ${lastName}`.trim() || "Atleta"

      return {
        client: {
          id: athleteId,
          name: fullName,
          alias: lastName ? `${firstName} ${lastName.charAt(0)}.` : firstName,
          avatar: initials,
          memberSince: createdAt,
          goal: "",
        },
        consent: {
          id: consent.id,
          status: consent.status,
          scope: consent.scope,
          expires_at: consent.expires_at,
        },
      }
    })

    return NextResponse.json(
      { clients, total: count ?? 0, limit, offset },
      { headers: { "X-Total-Count": String(count ?? 0) } }
    )
  } catch (err) {
    console.error("GET /api/trainer/clients unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
