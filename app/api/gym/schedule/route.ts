import { NextResponse } from "next/server"
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

export async function GET() {
  try {
    const supabase = await createClient()

    // Obtener gym_id del usuario autenticado
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

    const { data: profile } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", user.id)
      .single()

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
