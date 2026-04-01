import type { createAdminClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/types/database"

export type SupabaseClient = ReturnType<typeof createAdminClient>
export type PlanType = "monthly" | "quarterly" | "annual"
export type PaymentMethod = "cash" | "card" | "transfer" | "app"
export type PaymentStatus = Database["public"]["Enums"]["payment_status"]
export type PaymentGatewayName = "manual" | "future_provider"

export interface PaymentMembershipContext {
  id: string
  plan_type: PlanType
  status: Database["public"]["Enums"]["membership_status"] | null
  start_date: string | null
  end_date: string | null
  auto_renew: boolean | null
  price_paid: number | null
}

export interface PaymentInitiationInput {
  profile_id: string
  gym_id: string
  plan_type: PlanType
  method: PaymentMethod
  amount: number
  membership: PaymentMembershipContext | null
}

export interface PaymentInitiationResult {
  payment_id: string
  instructions: string
  gateway_name: PaymentGatewayName | string
  status: PaymentStatus | null
}

export interface PaymentWebhookInput {
  payload: unknown
  raw_body: string
  headers: Headers
}

export interface PaymentWebhookResult {
  received: boolean
  gateway_name: PaymentGatewayName | string
  processed: boolean
  status: string
  message: string
}

export interface PaymentAdapter {
  readonly gatewayName: PaymentGatewayName
  initiatePayment(
    supabase: SupabaseClient,
    input: PaymentInitiationInput
  ): Promise<PaymentInitiationResult>
  handleWebhook(input: PaymentWebhookInput): Promise<PaymentWebhookResult>
}
