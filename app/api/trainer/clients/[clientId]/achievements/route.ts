import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { requireActiveConsent, requireConsentScope } from "@/lib/consent-guards"
import { createClient } from "@/lib/supabase/server"

interface AchievementRow {
  id: string
  name: string
  description: string | null
}

interface UserAchievementRow {
  achievement_id: string
  unlocked_at: string
}

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

    const consentResult = await requireActiveConsent(supabase, coachId, clientId)
    if ("error" in consentResult) return consentResult.error

    const scopeResult = requireConsentScope(consentResult.consent, "view_achievements")
    if ("error" in scopeResult) return scopeResult.error

    const [
      { data: achievementsData, error: achievementsError },
      { data: unlockedData, error: unlockedError },
    ] = await Promise.all([
      supabase
        .from("achievements")
        .select("id, name, description")
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
      supabase
        .from("user_achievements")
        .select("achievement_id, unlocked_at")
        .eq("profile_id", clientId),
    ])

    if (achievementsError) {
      console.error("GET /api/trainer/clients/[clientId]/achievements achievements query error:", achievementsError)
      return NextResponse.json({ error: "Error al obtener logros" }, { status: 500 })
    }

    if (unlockedError) {
      console.error("GET /api/trainer/clients/[clientId]/achievements user_achievements query error:", unlockedError)
      return NextResponse.json({ error: "Error al obtener logros desbloqueados" }, { status: 500 })
    }

    const unlockedById = new Map<string, string>()
    for (const row of (unlockedData ?? []) as UserAchievementRow[]) {
      unlockedById.set(row.achievement_id, row.unlocked_at)
    }

    const achievements = ((achievementsData ?? []) as AchievementRow[]).map((ach) => {
      const unlockedAt = unlockedById.get(ach.id) ?? null
      return {
        id: ach.id,
        title: ach.name,
        description: ach.description ?? "",
        unlocked: Boolean(unlockedAt),
        ...(unlockedAt ? { date: unlockedAt } : {}),
      }
    })

    return NextResponse.json({ achievements })
  } catch (err) {
    console.error("GET /api/trainer/clients/[clientId]/achievements unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
