import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { paginationParams } from "@/lib/api-utils"

/* ---------- label maps ---------- */

export const STATUS_LABELS: Record<string, string> = {
  paid: "Pagado",
  pending: "Pendiente",
  overdue: "Vencido",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
}

export const METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  app: "App",
}

export const PLAN_LABELS: Record<string, string> = {
  basic: "Básico",
  premium: "Premium",
  vip: "VIP",
  custom: "Personalizado",
}

/* ---------- helpers ---------- */

interface ProfileRef {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
}

interface MembershipRef {
  plan_type: string | null
}

interface PaymentRow {
  id: string
  amount: number
  status: string
  method: string | null
  reference_code: string | null
  due_date: string | null
  paid_at: string | null
  notes: string | null
  created_at: string | null
  profile: unknown
  membership: unknown
}

interface PaymentKpiRow {
  amount: number
  status: string
  paid_at: string | null
  created_at: string | null
}

function normalizeEmbed<T>(raw: unknown): T | null {
  if (!raw) return null
  if (Array.isArray(raw)) return (raw[0] as T) ?? null
  return raw as T
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

    const { data: adminProfile, error: adminProfileError } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", adminId)
      .maybeSingle()

    if (adminProfileError || !adminProfile?.gym_id) {
      console.error("GET /api/admin/payments admin profile error:", adminProfileError)
      return NextResponse.json({ error: "No se pudo obtener el gym del administrador" }, { status: 500 })
    }

    const gymId = adminProfile.gym_id
    const { searchParams } = new URL(request.url)
    const { limit, offset } = paginationParams(searchParams)

    const { data: rawData, count, error } = await supabase
      .from("payments")
      .select(
        "id, amount, status, method, reference_code, due_date, paid_at, notes, created_at, " +
          "profile:profiles!profile_id(id, first_name, last_name, email, phone, avatar_url), " +
          "membership:memberships!membership_id(plan_type)",
        { count: "exact", head: false }
      )
      .eq("gym_id", gymId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)
    const data = rawData as unknown as PaymentRow[] | null

    if (error) {
      console.error("GET /api/admin/payments query error:", error)
      return NextResponse.json({ error: "Error al obtener pagos" }, { status: 500 })
    }

    const { data: rawKpiData, error: kpiError } = await supabase
      .from("payments")
      .select("amount, status, paid_at, created_at")
      .eq("gym_id", gymId)

    if (kpiError) {
      console.error("GET /api/admin/payments KPI query error:", kpiError)
      return NextResponse.json({ error: "Error al obtener pagos" }, { status: 500 })
    }

    const kpiData = (rawKpiData ?? []) as PaymentKpiRow[]

    // Compute KPIs server-side
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

    let totalRecaudado = 0
    let pendientes = 0
    let vencidos = 0
    let totalMes = 0

    const payments = (data ?? []).map((p) => {
      const profile = normalizeEmbed<ProfileRef>(p.profile)
      const membership = normalizeEmbed<MembershipRef>(p.membership)
      const firstName = profile?.first_name ?? ""
      const lastName = profile?.last_name ?? ""
      const planType = membership?.plan_type ?? ""

      return {
        id: p.id,
        amount: p.amount,
        status: p.status,
        statusLabel: STATUS_LABELS[p.status] ?? p.status,
        method: p.method ?? null,
        methodLabel: p.method ? (METHOD_LABELS[p.method] ?? p.method) : null,
        referenceCode: p.reference_code ?? null,
        dueDate: p.due_date ?? null,
        paidAt: p.paid_at ?? null,
        notes: p.notes ?? null,
        createdAt: p.created_at ?? null,
        member: profile
          ? {
              id: profile.id,
              name: `${firstName} ${lastName}`.trim() || "Miembro",
              email: profile.email ?? "",
              phone: profile.phone ?? "",
              avatar: memberAvatar(profile),
              plan: planType ? (PLAN_LABELS[planType] ?? planType) : "—",
              planLabel: planType ? (PLAN_LABELS[planType] ?? planType) : "—",
            }
          : null,
      }
    })

    for (const p of kpiData) {
      if (p.status === "paid" && p.paid_at && p.paid_at >= monthStart && p.paid_at < monthEnd) {
        totalRecaudado += Number(p.amount) || 0
      }
      if (p.status === "pending") pendientes++
      if (p.status === "overdue") vencidos++
      if (p.created_at && p.created_at >= monthStart && p.created_at < monthEnd) totalMes++
    }

    return NextResponse.json(
      {
        kpis: {
          totalRecaudado: Math.round(totalRecaudado * 100) / 100,
          pendientes,
          vencidos,
          totalMes,
        },
        payments,
        total: count ?? 0,
        limit,
        offset,
      },
      { headers: { "X-Total-Count": String(count ?? 0) } }
    )
  } catch (err) {
    console.error("GET /api/admin/payments unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
