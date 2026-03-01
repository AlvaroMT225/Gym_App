import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { handleApiError, validateBody } from "@/lib/api-utils"
import { accountUpdateBodySchema } from "@/lib/validations/admin"

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  super_admin: "Super Admin",
  coach: "Entrenador",
  athlete: "Atleta",
}

interface ProfileRow {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
  bio: string | null
  role: string
  settings: unknown
  created_at: string | null
}

function toProfileDto(row: ProfileRow) {
  return {
    id: row.id,
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    avatarUrl: row.avatar_url ?? null,
    bio: row.bio ?? "",
    role: row.role,
    roleLabel: ROLE_LABELS[row.role] ?? row.role,
    settings: row.settings ?? {},
    createdAt: row.created_at ?? null,
  }
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, phone, avatar_url, bio, role, settings, created_at")
      .eq("id", sessionOrResponse.userId)
      .single()

    if (error || !data) {
      console.error("GET /api/admin/account error:", error)
      return NextResponse.json({ error: "No se pudo obtener el perfil" }, { status: 500 })
    }

    return NextResponse.json({ profile: toProfileDto(data as unknown as ProfileRow) })
  } catch (err) {
    console.error("GET /api/admin/account unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const body = await validateBody(request, accountUpdateBodySchema)

    const updates: Record<string, unknown> = {}

    if (typeof body.firstName === "string") updates.first_name = body.firstName.trim()
    if (typeof body.lastName === "string") updates.last_name = body.lastName.trim()
    if (typeof body.phone === "string") updates.phone = body.phone.trim() || null
    if (typeof body.bio === "string") updates.bio = body.bio.trim() || null
    if (typeof body.avatarUrl === "string") updates.avatar_url = body.avatarUrl.trim() || null

    if (Object.keys(updates).length === 0) {
      // No changes — return current profile
      const supabase = await createClient()
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, phone, avatar_url, bio, role, settings, created_at")
        .eq("id", sessionOrResponse.userId)
        .single()
      return NextResponse.json({ profile: toProfileDto(data as unknown as ProfileRow) })
    }

    const adminSupabase = createAdminClient()

    const { data, error } = await adminSupabase
      .from("profiles")
      .update(updates)
      .eq("id", sessionOrResponse.userId)
      .select("id, first_name, last_name, email, phone, avatar_url, bio, role, settings, created_at")
      .single()

    if (error || !data) {
      console.error("PUT /api/admin/account update error:", error)
      return NextResponse.json({ error: "Error al actualizar el perfil" }, { status: 500 })
    }

    return NextResponse.json({ profile: toProfileDto(data as unknown as ProfileRow) })
  } catch (error) {
    return handleApiError(error)
  }
}
