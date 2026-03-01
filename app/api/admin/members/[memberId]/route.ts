import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

/* ---------- helpers ---------- */

const PLAN_LABELS: Record<string, string> = {
  basic: "Básico",
  premium: "Premium",
  vip: "VIP",
  custom: "Personalizado",
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  app: "App",
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
    return "vencido"
  }
  return "vencido"
}

/* ---------- GET ---------- */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const adminId = sessionOrResponse.userId

  try {
    const supabase = await createClient()

    const { data: adminProfile, error: adminProfileError } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", adminId)
      .maybeSingle()

    if (adminProfileError || !adminProfile?.gym_id) {
      console.error("GET /api/admin/members/[memberId] admin profile error:", adminProfileError)
      return NextResponse.json({ error: "No se pudo obtener el gym del administrador" }, { status: 500 })
    }

    const gymId = adminProfile.gym_id
    const now = new Date()
    const todayDate = now.toISOString().split("T")[0]
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

    // Parallel: membership + payment history
    const [
      { data: membershipData, error: membershipError },
      { data: paymentsData, error: paymentsError },
    ] = await Promise.all([
      supabase
        .from("memberships")
        .select(
          "id, plan_type, status, start_date, end_date, profile:profiles!profile_id(id, first_name, last_name, email, phone, avatar_url, created_at, bio)"
        )
        .eq("gym_id", gymId)
        .eq("profile_id", memberId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from("payments")
        .select("id, amount, status, paid_at, method, reference_code, notes")
        .eq("gym_id", gymId)
        .eq("profile_id", memberId)
        .order("paid_at", { ascending: false, nullsFirst: false }),
    ])

    if (membershipError) {
      console.error("GET /api/admin/members/[memberId] membership error:", membershipError)
      return NextResponse.json({ error: "Error al obtener membresía" }, { status: 500 })
    }

    if (!membershipData) {
      return NextResponse.json({ error: "Miembro no encontrado en este gym" }, { status: 404 })
    }

    if (paymentsError) {
      console.error("GET /api/admin/members/[memberId] payments error:", paymentsError)
    }

    const profile = normalizeProfile(membershipData.profile)
    if (!profile) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })
    }

    const firstName = profile.first_name ?? ""
    const lastName = profile.last_name ?? ""
    const displayStatus = deriveStatus(membershipData.status, membershipData.end_date, weekFromNow, todayDate)

    const member = {
      id: profile.id,
      name: `${firstName} ${lastName}`.trim() || "Miembro",
      email: profile.email ?? "",
      phone: profile.phone ?? "",
      avatar: memberAvatar(profile),
      plan: PLAN_LABELS[membershipData.plan_type] ?? membershipData.plan_type,
      planType: membershipData.plan_type,
      status: displayStatus,
      memberSince: profile.created_at ?? "",
      nextPayment: membershipData.end_date ?? "",
      notes: profile.bio ?? "",
    }

    const paymentHistory = (paymentsData ?? []).map((p) => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      date: p.paid_at ?? "",
      method: METHOD_LABELS[p.method] ?? (p.method ?? ""),
      reference: p.reference_code ?? "",
      notes: p.notes ?? "",
    }))

    return NextResponse.json({ member, paymentHistory })
  } catch (err) {
    console.error("GET /api/admin/members/[memberId] unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
