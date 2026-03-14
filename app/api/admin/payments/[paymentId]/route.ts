import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { STATUS_LABELS, METHOD_LABELS, PLAN_LABELS } from "../route"

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
  // --- Modificaciones Stripe ---
  stripe_payment_intent_id: string | null
  stripe_invoice_id: string | null
  stripe_checkout_session_id: string | null
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

async function getAdminGymId(adminId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase
    .from("profiles")
    .select("gym_id")
    .eq("id", adminId)
    .maybeSingle()
  if (error || !data?.gym_id) return null
  return data.gym_id as string
}

/* ---------- GET ---------- */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const gymId = await getAdminGymId(sessionOrResponse.userId, supabase)
    if (!gymId) return NextResponse.json({ error: "No se pudo obtener gym del administrador" }, { status: 500 })

    const [
      { data: rawPaymentData, error: paymentError },
      { data: remindersData, error: remindersError },
    ] = await Promise.all([
      supabase
        .from("payments")
        .select(
          "id, amount, status, method, reference_code, due_date, paid_at, notes, created_at, " +
          "stripe_payment_intent_id, stripe_invoice_id, stripe_checkout_session_id, " +
          "profile:profiles!profile_id(id, first_name, last_name, email, phone, avatar_url), " +
          "membership:memberships!membership_id(plan_type)"
        )
        .eq("id", paymentId)
        .eq("gym_id", gymId)
        .maybeSingle(),

      supabase
        .from("payment_reminders")
        .select("id, sent_at, method, status")
        .eq("payment_id", paymentId)
        .order("sent_at", { ascending: false }),
    ])

    const paymentData = rawPaymentData as unknown as PaymentRow | null

    if (paymentError) {
      console.error("GET /api/admin/payments/[id] payment error:", paymentError)
      return NextResponse.json({ error: "Error al obtener el pago" }, { status: 500 })
    }
    if (!paymentData) {
      return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 })
    }
    if (remindersError) {
      console.error("GET /api/admin/payments/[id] reminders error:", remindersError)
    }

    const profile = normalizeEmbed<ProfileRef>(paymentData.profile)
    const membership = normalizeEmbed<MembershipRef>(paymentData.membership)
    const planType = membership?.plan_type ?? ""

    const payment = {
      id: paymentData.id,
      amount: paymentData.amount,
      status: paymentData.status,
      statusLabel: STATUS_LABELS[paymentData.status] ?? paymentData.status,
      method: paymentData.method ?? null,
      methodLabel: paymentData.method ? (METHOD_LABELS[paymentData.method] ?? paymentData.method) : null,
      referenceCode: paymentData.reference_code ?? null,
      dueDate: paymentData.due_date ?? null,
      paidAt: paymentData.paid_at ?? null,
      notes: paymentData.notes ?? null,
      createdAt: paymentData.created_at ?? null,
      stripePaymentIntentId: paymentData.stripe_payment_intent_id,
      stripeInvoiceId: paymentData.stripe_invoice_id,
      stripeCheckoutSessionId: paymentData.stripe_checkout_session_id,
      member: profile
        ? {
            id: profile.id,
            name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "Miembro",
            email: profile.email ?? "",
            phone: profile.phone ?? "",
            avatar: memberAvatar(profile),
            plan: planType ? (PLAN_LABELS[planType] ?? planType) : "—",
            planLabel: planType ? (PLAN_LABELS[planType] ?? planType) : "—",
          }
        : null,
    }

    const reminders = (remindersData ?? []).map((r) => ({
      id: r.id,
      sentAt: r.sent_at,
      method: r.method,
      status: r.status,
    }))

    return NextResponse.json({ payment, reminders })
  } catch (err) {
    console.error("GET /api/admin/payments/[id] unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

/* ---------- PUT (mark as paid) ---------- */

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const gymId = await getAdminGymId(sessionOrResponse.userId, supabase)
    if (!gymId) return NextResponse.json({ error: "No se pudo obtener gym del administrador" }, { status: 500 })

    const body = await request.json()
    const { method, referenceCode, notes } = body as {
      method: "cash" | "card" | "transfer" | "app" | "stripe"
      referenceCode?: string
      notes?: string
    }

    if (!["cash", "card", "transfer", "app", "stripe"].includes(method)) {
      return NextResponse.json({ error: "Método de pago inválido" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("payments")
      .update({
        status: "paid",
        method,
        paid_at: new Date().toISOString(),
        reference_code: referenceCode ?? null,
        notes: notes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId)
      .eq("gym_id", gymId)
      .in("status", ["pending", "overdue"])
      .select("id, amount, status, method, reference_code, paid_at")
      .maybeSingle()

    if (error) {
      console.error("PUT /api/admin/payments/[id] update error:", error)
      return NextResponse.json({ error: "Error al registrar el pago" }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: "Pago no encontrado o ya procesado" }, { status: 404 })
    }

    return NextResponse.json({
      payment: {
        id: data.id,
        amount: data.amount,
        status: data.status,
        statusLabel: STATUS_LABELS[data.status] ?? data.status,
        method: data.method,
        methodLabel: data.method ? (METHOD_LABELS[data.method] ?? data.method) : null,
        referenceCode: data.reference_code ?? null,
        paidAt: data.paid_at ?? null,
      },
    })
  } catch (err) {
    console.error("PUT /api/admin/payments/[id] unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}