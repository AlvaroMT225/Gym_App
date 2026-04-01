import type { PaymentAdapter, PaymentGatewayName } from "@/lib/payment-adapters/interface"
import { futureProviderAdapter } from "@/lib/payment-adapters/future-provider"
import { manualPaymentAdapter } from "@/lib/payment-adapters/manual"

const PAYMENT_ADAPTERS: Record<PaymentGatewayName, PaymentAdapter> = {
  manual: manualPaymentAdapter,
  future_provider: futureProviderAdapter,
}

function isGatewayName(value: unknown): value is PaymentGatewayName {
  return typeof value === "string" && value in PAYMENT_ADAPTERS
}

export function getConfiguredPaymentGateway(): PaymentGatewayName {
  const configured = process.env.PAYMENTS_PROVIDER?.trim().toLowerCase()
  return isGatewayName(configured) ? configured : "manual"
}

export function getPaymentAdapter(gateway = getConfiguredPaymentGateway()): PaymentAdapter {
  return PAYMENT_ADAPTERS[gateway] ?? manualPaymentAdapter
}

export function getWebhookAdapter(gateway: string | null | undefined): PaymentAdapter | null {
  if (!isGatewayName(gateway)) {
    return null
  }

  return PAYMENT_ADAPTERS[gateway]
}
