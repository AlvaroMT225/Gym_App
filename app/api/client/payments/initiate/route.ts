import { NextRequest, NextResponse } from "next/server"
import type { PaymentMembershipContext, PaymentMethod, PlanType } from "@/lib/payment-adapters/interface"
import { getPaymentAdapter } from "@/lib/payment-adapters/registry"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createAdminClient, createClient } from "@/lib/supabase/server"

const PLAN_TYPES: PlanType[] = ["monthly", "quarterly", "annual"]
const PAYMENT_METHODS: PaymentMethod[] = ["cash", "card", "transfer", "app"]

function isPlanType(value: unknown): value is PlanType {
  return typeof value === "string" && PLAN_TYPES.includes(value as PlanType)
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === "string" && PAYMENT_METHODS.includes(value as PaymentMethod)
}

interface MembershipLookupRow {
  id: string
  plan_type: string | null
  status: PaymentMembershipContext["status"]
  start_date: string | null
  end_date: string | null
  auto_renew: boolean | null
  price_paid: number | null
}

function normalizeMembership(row: MembershipLookupRow | null): PaymentMembershipContext | null {
  if (!row || !isPlanType(row.plan_type)) {
    return null
  }

  return {
    id: row.id,
    plan_type: row.plan_type,
    status: row.status,
    start_date: row.start_date,
    end_date: row.end_date,
    auto_renew: row.auto_renew,
    price_paid: row.price_paid,
  }
}

async function getAthleteGymId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("gym_id")
    .eq("id", profileId)
    .maybeSingle()

  if (error) {
    console.error("POST /api/client/payments/initiate profile error:", error)
    throw new Error("PROFILE_LOOKUP_FAILED")
  }

  return data?.gym_id ?? null
}

async function getMembershipForPlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  gymId: string,
  planType: PlanType
): Promise<PaymentMembershipContext | null> {
  const todayIso = new Date().toISOString().slice(0, 10)

  const { data: activeMembership, error: activeError } = await supabase
    .from("memberships")
    .select("id, plan_type, status, start_date, end_date, auto_renew, price_paid")
    .eq("profile_id", profileId)
    .eq("gym_id", gymId)
    .eq("plan_type", planType)
    .eq("status", "active")
    .or(`end_date.is.null,end_date.gte.${todayIso}`)
    .order("end_date", { ascending: false, nullsFirst: false })
    .order("start_date", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (activeError) {
    console.error("POST /api/client/payments/initiate active membership error:", activeError)
    throw new Error("MEMBERSHIP_LOOKUP_FAILED")
  }

  const normalizedActiveMembership = normalizeMembership(activeMembership as MembershipLookupRow | null)
  if (normalizedActiveMembership) {
    return normalizedActiveMembership
  }

  const { data: latestMembership, error: latestError } = await supabase
    .from("memberships")
    .select("id, plan_type, status, start_date, end_date, auto_renew, price_paid")
    .eq("profile_id", profileId)
    .eq("gym_id", gymId)
    .eq("plan_type", planType)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestError) {
    console.error("POST /api/client/payments/initiate latest membership error:", latestError)
    throw new Error("MEMBERSHIP_LOOKUP_FAILED")
  }

  return normalizeMembership(latestMembership as MembershipLookupRow | null)
}

async function getActivePlanPrice(
  supabase: Awaited<ReturnType<typeof createClient>>,
  gymId: string,
  planType: PlanType
) {
  const { data, error } = await (supabase as any)
    .from("gym_plan_prices")
    .select("price")
    .eq("gym_id", gymId)
    .eq("plan_type", planType)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("POST /api/client/payments/initiate gym_plan_prices error:", error)
    throw new Error("PLAN_PRICE_LOOKUP_FAILED")
  }

  const amount = typeof data?.price === "number" ? data.price : Number(data?.price)

  if (!Number.isFinite(amount) || amount <= 0) {
    return null
  }

  return amount
}

export async function POST(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const payload = await request.json().catch(() => null)
    const planType = payload?.plan_type
    const method = payload?.method

    if (!isPlanType(planType) || !isPaymentMethod(method)) {
      return NextResponse.json({ error: "Datos de pago invalidos" }, { status: 400 })
    }

    const userClient = await createClient(request)
    const userId = sessionOrResponse.userId
    const gymId = await getAthleteGymId(userClient, userId)

    if (!gymId) {
      return NextResponse.json({ error: "Perfil sin gimnasio asociado" }, { status: 403 })
    }

    const amount = await getActivePlanPrice(userClient, gymId, planType)

    if (amount == null) {
      return NextResponse.json(
        { error: "No existe un precio activo configurado para este plan" },
        { status: 409 }
      )
    }

    const membership = await getMembershipForPlan(userClient, userId, gymId, planType)
    const adminClient = createAdminClient()
    const paymentAdapter = getPaymentAdapter()
    const result = await paymentAdapter.initiatePayment(adminClient, {
      profile_id: userId,
      gym_id: gymId,
      plan_type: planType,
      method,
      amount,
      membership,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("POST /api/client/payments/initiate unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
