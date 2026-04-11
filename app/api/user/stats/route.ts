import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { syncUserStatsForProfile } from "@/lib/user-stats-sync"

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    await syncUserStatsForProfile({
      profileId: sessionOrResponse.userId,
    })

    const supabase = await createClient(request)
    const { data, error } = await supabase
      .from("user_stats")
      .select("current_streak, total_points")
      .eq("profile_id", sessionOrResponse.userId)
      .maybeSingle()

    if (error) {
      console.error("GET /api/user/stats query error:", error)
      return NextResponse.json({ error: "Error al obtener estadisticas" }, { status: 500 })
    }

    return NextResponse.json({
      currentStreak: data?.current_streak ?? 0,
      totalPoints: data?.total_points ?? 0,
    })
  } catch (error) {
    console.error("GET /api/user/stats unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
