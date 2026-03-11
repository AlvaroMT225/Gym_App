import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ machineId: string }> }
) {
  const { machineId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient(request)
    const userId = sessionOrResponse.userId

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", userId)
      .maybeSingle()

    if (profileError) {
      console.error("GET /api/machines/[machineId] profile error:", profileError)
      return NextResponse.json({ error: "Error al obtener maquina" }, { status: 500 })
    }

    if (!profile?.gym_id) {
      return NextResponse.json({ machine: null })
    }

    const { data: machine, error: machineError } = await supabase
      .from("machines")
      .select("id, gym_id, name, description, muscle_groups, equipment_type, status, location, image_url, instructions, settings")
      .eq("id", machineId)
      .eq("gym_id", profile.gym_id)
      .maybeSingle()

    if (machineError) {
      console.error("GET /api/machines/[machineId] query error:", machineError)
      return NextResponse.json({ error: "Error al obtener maquina" }, { status: 500 })
    }

    return NextResponse.json({ machine: machine ?? null })
  } catch (error) {
    console.error("GET /api/machines/[machineId] unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
