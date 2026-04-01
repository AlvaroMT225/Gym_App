import type {
  PaymentAdapter,
  PaymentInitiationInput,
  PaymentInitiationResult,
  PaymentWebhookInput,
  PaymentWebhookResult,
  SupabaseClient,
} from "@/lib/payment-adapters/interface"

function requireFutureProviderEnv() {
  const apiUrl = process.env.FUTURE_PAYMENT_PROVIDER_API_URL?.trim()
  const publicKey = process.env.FUTURE_PAYMENT_PROVIDER_PUBLIC_KEY?.trim()
  const secretKey = process.env.FUTURE_PAYMENT_PROVIDER_SECRET_KEY?.trim()

  if (!apiUrl || !publicKey || !secretKey) {
    throw new Error("FUTURE_PROVIDER_NOT_CONFIGURED")
  }

  return { apiUrl, publicKey, secretKey }
}

async function initiatePayment(
  _supabase: SupabaseClient,
  input: PaymentInitiationInput
): Promise<PaymentInitiationResult> {
  const { apiUrl } = requireFutureProviderEnv()

  throw new Error(
    `FUTURE_PROVIDER_NOT_IMPLEMENTED:${apiUrl}:${input.plan_type}:${input.method}`
  )
}

async function handleWebhook(_input: PaymentWebhookInput): Promise<PaymentWebhookResult> {
  if (!process.env.FUTURE_PAYMENT_PROVIDER_WEBHOOK_SECRET?.trim()) {
    return {
      received: true,
      gateway_name: "future_provider",
      processed: false,
      status: "ignored",
      message: "Future provider webhook is not configured yet.",
    }
  }

  return {
    received: true,
    gateway_name: "future_provider",
    processed: false,
    status: "ignored",
    message: "Future provider adapter scaffold is present but not implemented.",
  }
}

// Dormant scaffold only. Keep PAYMENTS_PROVIDER unset or "manual" until a real gateway is selected.
export const futureProviderAdapter: PaymentAdapter = {
  gatewayName: "future_provider",
  initiatePayment,
  handleWebhook,
}
