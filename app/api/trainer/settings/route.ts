import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

const DEFAULT_AVAILABILITY = [
  { day: "Lunes", from: "08:00", to: "17:00", enabled: true },
  { day: "Martes", from: "08:00", to: "17:00", enabled: true },
  { day: "Miércoles", from: "08:00", to: "17:00", enabled: true },
  { day: "Jueves", from: "08:00", to: "17:00", enabled: true },
  { day: "Viernes", from: "08:00", to: "17:00", enabled: true },
  { day: "Sábado", from: "08:00", to: "13:00", enabled: false },
  { day: "Domingo", from: "08:00", to: "13:00", enabled: false },
]

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const coachId = sessionOrResponse.userId

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("profiles")
      .select("first_name, last_name, email, bio, avatar_url, settings")
      .eq("id", coachId)
      .single()

    if (error || !data) {
      console.error("GET /api/trainer/settings profile error:", error)
      return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 })
    }

    const firstName = data.first_name ?? ""
    const lastName = data.last_name ?? ""
    const savedSettings = (data.settings as Record<string, unknown>) ?? {}

    return NextResponse.json({
      profile: {
        name: `${firstName} ${lastName}`.trim() || "Coach",
        email: data.email ?? "",
        avatar: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "CO",
      },
      settings: {
        bio: data.bio ?? "",
        specialties: (savedSettings.specialties as string[]) ?? [],
        availability: (savedSettings.availability as unknown[]) ?? DEFAULT_AVAILABILITY,
        maxClients: (savedSettings.maxClients as number) ?? 20,
        notifyNewClient: (savedSettings.notifyNewClient as boolean) ?? true,
        notifyProposalResponse: (savedSettings.notifyProposalResponse as boolean) ?? true,
        notifyConsentExpiry: (savedSettings.notifyConsentExpiry as boolean) ?? true,
      },
    })
  } catch (err) {
    console.error("GET /api/trainer/settings unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const coachId = sessionOrResponse.userId

  try {
    const supabase = await createClient()

    const body = await request.json()
    const { bio, specialties, availability, maxClients, notifyNewClient, notifyProposalResponse, notifyConsentExpiry } =
      body

    const { error } = await supabase
      .from("profiles")
      .update({
        bio: typeof bio === "string" ? bio : undefined,
        settings: {
          specialties: Array.isArray(specialties) ? specialties : [],
          availability: Array.isArray(availability) ? availability : [],
          maxClients: typeof maxClients === "number" ? maxClients : 20,
          notifyNewClient: typeof notifyNewClient === "boolean" ? notifyNewClient : true,
          notifyProposalResponse: typeof notifyProposalResponse === "boolean" ? notifyProposalResponse : true,
          notifyConsentExpiry: typeof notifyConsentExpiry === "boolean" ? notifyConsentExpiry : true,
        },
      })
      .eq("id", coachId)

    if (error) {
      console.error("PUT /api/trainer/settings update error:", error)
      return NextResponse.json({ error: "Error al guardar ajustes" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("PUT /api/trainer/settings unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
