import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const userId = sessionOrResponse.userId

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", userId)
      .maybeSingle()

    if (profileError) {
      console.error("GET /api/machines/catalog profile error:", profileError)
      return NextResponse.json({ error: "Error al obtener maquinas" }, { status: 500 })
    }

    if (!profile?.gym_id) {
      return NextResponse.json({ machines: [] })
    }

    const { data: machines, error: machinesError } = await supabase
      .from("machines")
      .select("id, name, description, muscle_groups, equipment_type, status, location, image_url")
      .eq("gym_id", profile.gym_id)
      .order("name", { ascending: true })

    if (machinesError) {
      console.error("GET /api/machines/catalog query error:", machinesError)
      return NextResponse.json({ error: "Error al obtener maquinas" }, { status: 500 })
    }

    return NextResponse.json({ machines: machines ?? [] })
  } catch (error) {
    console.error("GET /api/machines/catalog unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
