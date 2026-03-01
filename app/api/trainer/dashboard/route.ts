import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const coachId = sessionOrResponse.userId

  try {
    const supabase = await createClient()
    const now = new Date()
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Compute current week bounds (Monday–Sunday) as YYYY-MM-DD for DATE column
    const weekStart = new Date(now)
    weekStart.setHours(0, 0, 0, 0)
    const dayOfWeek = weekStart.getDay() // 0 = Sun
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    weekStart.setDate(weekStart.getDate() - daysToMonday)
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
    const weekStartStr = weekStart.toISOString().split("T")[0]
    const weekEndStr = weekEnd.toISOString().split("T")[0]

    const [
      clientCountResult,
      pendingProposalsResult,
      expiringConsentsResult,
      plannedThisWeekResult,
      recentNotesResult,
    ] = await Promise.all([
      // 1. Active clients — consents WHERE status = 'active'
      supabase
        .from("consents")
        .select("*", { count: "exact", head: true })
        .eq("coach_id", coachId)
        .eq("status", "active"),

      // 2. Pending proposals — sent but not yet accepted/rejected
      supabase
        .from("proposals")
        .select("*", { count: "exact", head: true })
        .eq("coach_id", coachId)
        .eq("status", "sent"),

      // 3. Expiring consents — active and expires within 7 days
      supabase
        .from("consents")
        .select("*", { count: "exact", head: true })
        .eq("coach_id", coachId)
        .eq("status", "active")
        .gte("expires_at", now.toISOString())
        .lte("expires_at", sevenDaysLater.toISOString()),

      // 4. Calendar events this week
      supabase
        .from("coach_calendar_events")
        .select("*", { count: "exact", head: true })
        .eq("coach_id", coachId)
        .gte("event_date", weekStartStr)
        .lt("event_date", weekEndStr),

      // 5. Recent activity — latest 5 client notes with athlete name
      supabase
        .from("client_notes")
        .select("content, created_at, tags, athlete:athlete_id(first_name, last_name)")
        .eq("coach_id", coachId)
        .order("created_at", { ascending: false })
        .limit(5),
    ])

    if (clientCountResult.error) {
      console.error("GET /api/trainer/dashboard clientCount error:", clientCountResult.error)
    }
    if (pendingProposalsResult.error) {
      console.error("GET /api/trainer/dashboard pendingProposals error:", pendingProposalsResult.error)
    }
    if (expiringConsentsResult.error) {
      console.error("GET /api/trainer/dashboard expiringConsents error:", expiringConsentsResult.error)
    }
    if (plannedThisWeekResult.error) {
      console.error("GET /api/trainer/dashboard plannedThisWeek error:", plannedThisWeekResult.error)
    }
    if (recentNotesResult.error) {
      console.error("GET /api/trainer/dashboard recentNotes error:", recentNotesResult.error)
    }

    // Map notes to the shape the component expects
    const recentActivity = (recentNotesResult.data ?? []).map((note) => {
      const athlete = Array.isArray(note.athlete) ? note.athlete[0] : note.athlete
      const firstName: string = (athlete as { first_name?: string } | null)?.first_name ?? ""
      const lastName: string = (athlete as { last_name?: string } | null)?.last_name ?? ""
      const clientName = `${firstName} ${lastName}`.trim() || "Atleta"
      const clientAvatar = firstName.charAt(0).toUpperCase() || "?"
      return {
        type: "note" as const,
        clientName,
        clientAvatar,
        message: note.content,
        date: note.created_at,
      }
    })

    return NextResponse.json({
      clientCount: clientCountResult.count ?? 0,
      pendingProposals: pendingProposalsResult.count ?? 0,
      expiringConsents: expiringConsentsResult.count ?? 0,
      plannedThisWeek: plannedThisWeekResult.count ?? 0,
      recentActivity,
    })
  } catch (error) {
    console.error("GET /api/trainer/dashboard unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
