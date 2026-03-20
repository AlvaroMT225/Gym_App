import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

const DAY_NAMES: Record<number, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient(request)
    const athleteId = sessionOrResponse.userId

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", athleteId)
      .maybeSingle()

    if (profileError) {
      console.error("GET /api/gym/schedule profile error:", profileError)
      return NextResponse.json({ error: "Error al obtener horario" }, { status: 500 })
    }

    if (!profile?.gym_id) return NextResponse.json({ error: "Sin gimnasio" }, { status: 404 })

    const { data: rows, error } = await supabase
      .from("gym_schedules")
      .select("day_of_week, opens_at, closes_at, is_closed")
      .eq("gym_id", profile.gym_id)
      .order("day_of_week", { ascending: true })

    if (error) throw error

    const schedule = (rows || []).map((r) => ({
      day: DAY_NAMES[r.day_of_week] || `Día ${r.day_of_week}`,
      open: r.is_closed ? null : (r.opens_at?.slice(0, 5) || "00:00"),
      close: r.is_closed ? null : (r.closes_at?.slice(0, 5) || "00:00"),
      isClosed: r.is_closed,
    }))

    return NextResponse.json({ schedule })
  } catch (err: unknown) {
    console.error("GET /api/gym/schedule error:", err)
    return NextResponse.json({ error: "Error al obtener horario" }, { status: 500 })
  }
}
