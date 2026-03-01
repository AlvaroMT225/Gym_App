import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { paginationParams } from "@/lib/api-utils"

/* ---------- helpers ---------- */

const PLAN_LABELS: Record<string, string> = {
  basic: "Básico",
  premium: "Premium",
  vip: "VIP",
  custom: "Personalizado",
}

interface ProfileRef {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
  created_at: string | null
  bio: string | null
}

function normalizeProfile(raw: unknown): ProfileRef | null {
  if (!raw) return null
  if (Array.isArray(raw)) return (raw[0] as ProfileRef) ?? null
  return raw as ProfileRef
}

function memberAvatar(p: ProfileRef): string {
  const f = (p.first_name ?? "?")[0]?.toUpperCase() ?? "?"
  const l = (p.last_name ?? "?")[0]?.toUpperCase() ?? "?"
  return `${f}${l}`
}

function deriveStatus(status: string, endDate: string | null, weekFromNow: string, todayDate: string): string {
  if (status === "expired") return "vencido"
  if (status === "active" && endDate) {
    if (endDate <= weekFromNow && endDate >= todayDate) return "por_vencer"
    if (endDate > weekFromNow) return "al_dia"
    // active but end_date already past - treat as vencido
    return "vencido"
  }
  // suspended, inactive, pending, cancelled, etc.
  return "vencido"
}

/* ---------- GET ---------- */

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const adminId = sessionOrResponse.userId

  try {
    const supabase = await createClient()

    const { data: adminProfile, error: profileError } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", adminId)
      .maybeSingle()

    if (profileError || !adminProfile?.gym_id) {
      console.error("GET /api/admin/members profile error:", profileError)
      return NextResponse.json({ error: "No se pudo obtener el gym del administrador" }, { status: 500 })
    }

    const gymId = adminProfile.gym_id
    const now = new Date()
    const todayDate = now.toISOString().split("T")[0]
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    const { searchParams } = new URL(request.url)
    const { limit, offset } = paginationParams(searchParams)

    const { count: totalCount, error: countError } = await supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("gym_id", gymId)

    if (countError) {
      console.error("GET /api/admin/members count error:", countError)
      return NextResponse.json({ error: "Error al obtener miembros" }, { status: 500 })
    }

    const total = totalCount ?? 0

    if (offset >= total) {
      return NextResponse.json(
        { members: [], total, limit, offset },
        { headers: { "X-Total-Count": String(total) } }
      )
    }

    const { data, error } = await supabase
      .from("memberships")
      .select(
        "id, plan_type, status, start_date, end_date, profile:profiles!profile_id(id, first_name, last_name, email, phone, avatar_url, created_at, bio)"
      )
      .eq("gym_id", gymId)
      .order("end_date", { ascending: true, nullsFirst: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("GET /api/admin/members query error:", error)
      return NextResponse.json({ error: "Error al obtener miembros" }, { status: 500 })
    }

    const members = (data ?? []).map((m) => {
      const profile = normalizeProfile(m.profile)
      if (!profile) return null

      const firstName = profile.first_name ?? ""
      const lastName = profile.last_name ?? ""
      const displayStatus = deriveStatus(m.status, m.end_date, weekFromNow, todayDate)

      return {
        id: profile.id,
        name: `${firstName} ${lastName}`.trim() || "Miembro",
        email: profile.email ?? "",
        phone: profile.phone ?? "",
        avatar: memberAvatar(profile),
        plan: PLAN_LABELS[m.plan_type] ?? m.plan_type,
        planType: m.plan_type,
        status: displayStatus,
        memberSince: profile.created_at ?? "",
        nextPayment: m.end_date ?? "",
        notes: profile.bio ?? "",
      }
    }).filter(Boolean)

    return NextResponse.json(
      { members, total, limit, offset },
      { headers: { "X-Total-Count": String(total) } }
    )
  } catch (err) {
    console.error("GET /api/admin/members unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

