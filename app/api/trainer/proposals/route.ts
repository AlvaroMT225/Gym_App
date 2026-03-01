import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { paginationParams } from "@/lib/api-utils"

export async function GET(request: NextRequest) {
  // 1. Restaurados los roles originales
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const trainerId = sessionOrResponse.userId
  
  // 2. Agregado el await obligatorio para Next.js SSR
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const { limit, offset } = paginationParams(searchParams)

  const { data: proposalsData, count, error } = await supabase
    .from("proposals")
    .select(`
      id,
      athlete_id,
      type,
      status,
      title,
      updated_at,
      athlete:profiles!athlete_id(
        first_name,
        last_name,
        avatar_url
      )
    `, { count: "exact", head: false })
    .eq("coach_id", trainerId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error("Error fetching proposals:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }

  // 3. Casteo a any en el map para bypassear la falta de database.types.ts
  const mappedProposals = (proposalsData || []).map((p: any) => {
    // Supabase a veces devuelve los joins como array, lo normalizamos a objeto
    const athleteData = Array.isArray(p.athlete) ? p.athlete[0] : p.athlete

    const clientName = [athleteData?.first_name, athleteData?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim()

    return {
      id: p.id,
      type: p.type as "routine" | "session",
      title: p.title,
      status: p.status,
      clientId: p.athlete_id,
      clientName: clientName || p.athlete_id,
      clientAvatar: athleteData?.avatar_url || "??",
      date: p.updated_at,
      version: 1,
      changelog: [],
    }
  })

  return NextResponse.json(
    { proposals: mappedProposals, total: count ?? 0, limit, offset },
    { headers: { "X-Total-Count": String(count ?? 0) } }
  )
}
