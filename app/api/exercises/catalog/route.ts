import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { requireActiveConsent, requireConsentScope } from "@/lib/consent-guards"
import { createClient } from "@/lib/supabase/server"

interface MachineRow {
  id: string
  name: string
}

interface ExerciseRow {
  id: string
  name: string
  primary_muscles: string[] | null
  machine: MachineRow | MachineRow[] | null
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const coachId = sessionOrResponse.userId
  const clientId = request.nextUrl.searchParams.get("clientId")
  if (!clientId) {
    return NextResponse.json({ error: "clientId requerido" }, { status: 400 })
  }

  try {
    const supabase = await createClient()

    const consentResult = await requireActiveConsent(supabase, coachId, clientId)
    if ("error" in consentResult) return consentResult.error

    const scopeResult = requireConsentScope(consentResult.consent, "view_routines")
    if ("error" in scopeResult) return scopeResult.error

    const { data, error } = await supabase
      .from("exercises")
      .select("id, name, primary_muscles, machine:machines(id, name)")
      .order("name")

    if (error) {
      console.error("GET /api/exercises/catalog query error:", error)
      return NextResponse.json({ error: "Error al obtener catálogo de ejercicios" }, { status: 500 })
    }

    const exercises = ((data ?? []) as ExerciseRow[]).map((ex) => {
      const machine = Array.isArray(ex.machine) ? ex.machine[0] ?? null : ex.machine
      return {
        id: ex.id,
        name: ex.name,
        muscles: ex.primary_muscles ?? [],
        machineId: machine?.id ?? null,
        machineName: machine?.name ?? null,
      }
    })

    return NextResponse.json({ exercises })
  } catch (err) {
    console.error("GET /api/exercises/catalog unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
