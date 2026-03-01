import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { ROLE_LABELS } from "../route"
import { handleApiError, validateBody } from "@/lib/api-utils"
import { staffUpdateBodySchema } from "@/lib/validations/admin"

interface StaffRoleRow {
  permissions: unknown
  assigned_at: string | null
}

interface ProfileRow {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  role: string
  is_active: boolean | null
  created_at: string | null
  staff_roles: unknown
}

function normalizeEmbed<T>(raw: unknown): T | null {
  if (!raw) return null
  if (Array.isArray(raw)) return (raw[0] as T) ?? null
  return raw as T
}

function toStaffDto(row: ProfileRow) {
  const staffRole = normalizeEmbed<StaffRoleRow>(row.staff_roles)
  const permissions = Array.isArray(staffRole?.permissions)
    ? (staffRole.permissions as string[])
    : []
  return {
    id: row.id,
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? null,
    role: row.role,
    roleLabel: ROLE_LABELS[row.role] ?? row.role,
    isActive: row.is_active !== false,
    permissions,
    assignedAt: staffRole?.assigned_at ?? null,
    createdAt: row.created_at ?? null,
  }
}

async function getStaffScopedToGym(
  supabase: Awaited<ReturnType<typeof createClient>>,
  staffId: string,
  gymId: string
) {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, email, phone, role, is_active, created_at, " +
        "staff_roles!profile_id(permissions, assigned_at)"
    )
    .eq("id", staffId)
    .eq("gym_id", gymId)
    .in("role", ["admin", "coach", "super_admin"])
    .maybeSingle()

  if (error || !data) return null
  return data as unknown as ProfileRow
}

async function getAdminGymId(
  adminId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("gym_id")
    .eq("id", adminId)
    .maybeSingle()
  if (error || !data?.gym_id) return null
  return data.gym_id as string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  const { staffId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const gymId = await getAdminGymId(sessionOrResponse.userId, supabase)
    if (!gymId) {
      return NextResponse.json({ error: "No se pudo obtener gym del administrador" }, { status: 500 })
    }

    const row = await getStaffScopedToGym(supabase, staffId, gymId)
    if (!row) {
      return NextResponse.json({ error: "Miembro de staff no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ member: toStaffDto(row) })
  } catch (err) {
    console.error("GET /api/admin/staff/[id] unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  const { staffId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const gymId = await getAdminGymId(sessionOrResponse.userId, supabase)
    if (!gymId) {
      return NextResponse.json({ error: "No se pudo obtener gym del administrador" }, { status: 500 })
    }

    const existing = await getStaffScopedToGym(supabase, staffId, gymId)
    if (!existing) {
      return NextResponse.json({ error: "Miembro de staff no encontrado" }, { status: 404 })
    }

    const body = await validateBody(request, staffUpdateBodySchema)

    const adminSupabase = createAdminClient()

    // --- Update profiles (role and/or isActive) ---
    const profileUpdates: Record<string, unknown> = {}

    if (
      typeof body.role === "string" &&
      ["admin", "coach", "super_admin"].includes(body.role)
    ) {
      profileUpdates.role = body.role
    }
    if (typeof body.isActive === "boolean") {
      profileUpdates.is_active = body.isActive
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await adminSupabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", staffId)
        .eq("gym_id", gymId)

      if (profileError) {
        console.error("PUT /api/admin/staff/[id] profile update error:", profileError)
        return NextResponse.json({ error: "Error al actualizar perfil" }, { status: 500 })
      }
    }

    // --- Upsert staff_roles (role and/or permissions) ---
    const needsStaffRoleUpdate =
      (typeof body.role === "string" && ["admin", "coach", "super_admin"].includes(body.role)) ||
      Array.isArray(body.permissions)

    if (needsStaffRoleUpdate) {
      // Always provide role (NOT NULL constraint) — use updated or existing
      const roleForUpsert =
        typeof body.role === "string" && ["admin", "coach", "super_admin"].includes(body.role)
          ? body.role
          : existing.role

      const upsertData: Record<string, unknown> = {
        profile_id: staffId,
        gym_id: gymId,
        role: roleForUpsert,
      }

      if (Array.isArray(body.permissions)) {
        upsertData.permissions = body.permissions
      }

      const { error: staffRoleError } = await adminSupabase
        .from("staff_roles")
        .upsert(upsertData, { onConflict: "profile_id,gym_id" })

      if (staffRoleError) {
        console.error("PUT /api/admin/staff/[id] staff_roles upsert error:", staffRoleError)
        return NextResponse.json({ error: "Error al actualizar permisos" }, { status: 500 })
      }
    }

    // Fetch updated member using adminSupabase to bypass RLS after write
    const updated = await getStaffScopedToGym(adminSupabase as Awaited<ReturnType<typeof createClient>>, staffId, gymId)
    if (!updated) {
      return NextResponse.json({ error: "No se pudo recuperar datos actualizados" }, { status: 500 })
    }

    return NextResponse.json({ member: toStaffDto(updated) })
  } catch (error) {
    return handleApiError(error)
  }
}
