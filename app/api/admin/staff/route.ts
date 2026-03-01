import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { paginationParams } from "@/lib/api-utils"

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  coach: "Entrenador",
  super_admin: "Super Admin",
  athlete: "Atleta",
}

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

interface StaffKpiRow {
  role: string
  is_active: boolean | null
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

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", sessionOrResponse.userId)
      .maybeSingle()

    if (profileError || !profileData?.gym_id) {
      return NextResponse.json({ error: "No se pudo obtener gym del administrador" }, { status: 500 })
    }

    const gymId = profileData.gym_id as string
    const { searchParams } = new URL(request.url)
    const { limit, offset } = paginationParams(searchParams)

    const { data: rawData, count, error } = await supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, email, phone, role, is_active, created_at, " +
          "staff_roles!profile_id(permissions, assigned_at)",
        { count: "exact", head: false }
      )
      .eq("gym_id", gymId)
      .in("role", ["admin", "coach", "super_admin"])
      .order("role")
      .order("first_name")
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("GET /api/admin/staff error:", error)
      return NextResponse.json({ error: "Error al obtener staff" }, { status: 500 })
    }

    const { data: rawKpiData, error: kpiError } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("gym_id", gymId)
      .in("role", ["admin", "coach", "super_admin"])

    if (kpiError) {
      console.error("GET /api/admin/staff KPI error:", kpiError)
      return NextResponse.json({ error: "Error al obtener staff" }, { status: 500 })
    }

    const data = rawData as unknown as ProfileRow[] | null
    const kpiData = (rawKpiData ?? []) as StaffKpiRow[]
    const staff = (data ?? []).map(toStaffDto)

    const kpis = {
      total: kpiData.length,
      admins: kpiData.filter((s) => s.role === "admin" || s.role === "super_admin").length,
      coaches: kpiData.filter((s) => s.role === "coach").length,
      activos: kpiData.filter((s) => s.is_active !== false).length,
    }

    return NextResponse.json(
      { kpis, staff, total: count ?? 0, limit, offset },
      { headers: { "X-Total-Count": String(count ?? 0) } }
    )
  } catch (err) {
    console.error("GET /api/admin/staff unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
