import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

/* ---------- helpers ---------- */

interface ProfileRef {
  id: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  phone: string | null
}

function normalizeProfile(raw: unknown): ProfileRef | null {
  if (!raw) return null
  if (Array.isArray(raw)) return (raw[0] as ProfileRef) ?? null
  return raw as ProfileRef
}

function memberName(p: ProfileRef): string {
  return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.id
}

function memberAvatar(p: ProfileRef): string {
  const f = (p.first_name ?? "?")[0]?.toUpperCase() ?? "?"
  const l = (p.last_name ?? "?")[0]?.toUpperCase() ?? "?"
  return `${f}${l}`
}

/* ---------- GET ---------- */

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const adminId = sessionOrResponse.userId

  try {
    const supabase = await createClient()

    // Get admin's gym_id
    const { data: adminProfile, error: profileError } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", adminId)
      .maybeSingle()

    if (profileError || !adminProfile?.gym_id) {
      console.error("GET /api/admin/operations profile error:", profileError)
      return NextResponse.json({ error: "No se pudo obtener el gym del administrador" }, { status: 500 })
    }

    const gymId = adminProfile.gym_id
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    const todayDate = now.toISOString().split("T")[0]

    // 4 parallel queries
    const [
      { data: membershipsData, error: membershipsError },
      { count: pagosHoy, error: pagosError },
      { count: promosActivas, error: promosError },
      { count: incidencias, error: machinesError },
    ] = await Promise.all([
      // Query 1: memberships with profile info
      supabase
        .from("memberships")
        .select("id, status, end_date, profile:profiles!profile_id(id, first_name, last_name, avatar_url, phone)")
        .eq("gym_id", gymId),

      // Query 2: payments today
      supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("gym_id", gymId)
        .eq("status", "paid")
        .gte("paid_at", todayStart)
        .lt("paid_at", tomorrowStart),

      // Query 3: active promotions
      supabase
        .from("promotions")
        .select("id", { count: "exact", head: true })
        .eq("gym_id", gymId)
        .eq("status", "active"),

      // Query 4: machine incidents (non-available)
      supabase
        .from("machines")
        .select("id", { count: "exact", head: true })
        .eq("gym_id", gymId)
        .neq("status", "available"),
    ])

    if (membershipsError) {
      console.error("GET /api/admin/operations memberships error:", membershipsError)
      return NextResponse.json({ error: "Error al obtener membresías" }, { status: 500 })
    }

    // Log non-fatal errors
    if (pagosError) console.error("GET /api/admin/operations payments error:", pagosError)
    if (promosError) console.error("GET /api/admin/operations promotions error:", promosError)
    if (machinesError) console.error("GET /api/admin/operations machines error:", machinesError)

    // Compute KPIs and member lists from memberships
    type MemberEntry = { id: string; name: string; avatar: string; phone: string; endDate: string; status: string }

    const vencidosList: MemberEntry[] = []
    const porVencerList: MemberEntry[] = []
    let alDia = 0

    for (const m of membershipsData ?? []) {
      const profile = normalizeProfile(m.profile)
      if (!profile) continue

      const entry: MemberEntry = {
        id: profile.id,
        name: memberName(profile),
        avatar: memberAvatar(profile),
        phone: profile.phone ?? "",
        endDate: m.end_date ?? "",
        status: "",
      }

      if (m.status === "expired") {
        entry.status = "vencido"
        vencidosList.push(entry)
      } else if (m.status === "active") {
        const endDate = m.end_date ?? ""
        if (endDate && endDate <= weekFromNow && endDate >= todayDate) {
          entry.status = "por_vencer"
          porVencerList.push(entry)
        } else if (endDate > weekFromNow) {
          entry.status = "al_dia"
          alDia++
        }
      }
    }

    // Combined members list for reminders sheet (vencidos + por_vencer + al_dia)
    const allMembers: MemberEntry[] = []
    for (const m of membershipsData ?? []) {
      const profile = normalizeProfile(m.profile)
      if (!profile) continue
      let status = "al_dia"
      if (m.status === "expired") {
        status = "vencido"
      } else if (m.status === "active") {
        const endDate = m.end_date ?? ""
        if (endDate && endDate <= weekFromNow && endDate >= todayDate) {
          status = "por_vencer"
        }
      }
      allMembers.push({
        id: profile.id,
        name: memberName(profile),
        avatar: memberAvatar(profile),
        phone: profile.phone ?? "",
        endDate: m.end_date ?? "",
        status,
      })
    }

    return NextResponse.json({
      kpis: {
        alDia,
        porVencer: porVencerList.length,
        vencidos: vencidosList.length,
        pagosHoy: pagosHoy ?? 0,
        promosActivas: promosActivas ?? 0,
        incidencias: incidencias ?? 0,
      },
      vencidos: vencidosList,
      porVencer: porVencerList,
      members: allMembers,
    })
  } catch (err) {
    console.error("GET /api/admin/operations unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
