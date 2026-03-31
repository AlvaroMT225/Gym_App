import type {
  PaymentAdapter,
  PaymentInitiationInput,
  PaymentInitiationResult,
  PaymentWebhookInput,
  PaymentWebhookResult,
  SupabaseClient,
} from "@/lib/payment-adapters/interface"

function generateReferenceCode() {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)
  const random = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `MAN-${timestamp}-${random}`
}

function buildInstructions(input: PaymentInitiationInput, amount: number) {
  if (amount > 0) {
    return `Pago manual registrado para el plan ${input.plan_type}. Completa el pago con administracion y espera confirmacion antes de asumir la activacion.`
  }

  return `Pago manual registrado para el plan ${input.plan_type}. El monto debe ser confirmado por administracion antes de completar el cobro.`
}

async function insertPendingPayment(
  supabase: SupabaseClient,
  input: PaymentInitiationInput,
  amount: number,
  instructions: string
) {
  const dueDate = new Date().toISOString().slice(0, 10)

  return supabase
    .from("payments")
    .insert({
      profile_id: input.profile_id,
      gym_id: input.gym_id,
      membership_id: input.membership?.id ?? null,
      amount,
      status: "pending",
      method: input.method,
      gateway_name: "manual",
      gateway_transaction_id: null,
      reference_code: generateReferenceCode(),
      due_date: dueDate,
      notes: instructions,
    })
    .select("id, status")
    .single()
}

async function initiatePayment(
  supabase: SupabaseClient,
  input: PaymentInitiationInput
): Promise<PaymentInitiationResult> {
  const amount = Number(input.amount)
  const instructions = buildInstructions(input, amount)

  const { data, error } = await insertPendingPayment(supabase, input, amount, instructions)

  if (error || !data) {
    console.error("manualPaymentAdapter.initiatePayment insert error:", error)
    throw new Error("PAYMENT_INITIATE_FAILED")
  }

  return {
    payment_id: data.id,
    instructions,
    gateway_name: "manual",
    status: data.status,
  }
}

async function handleWebhook(input: PaymentWebhookInput): Promise<PaymentWebhookResult> {
  return {
    received: true,
    gateway_name: "manual",
    processed: false,
    status: "ignored",
    message:
      "Manual adapter webhook acknowledged. No payment confirmation is performed without a real provider event.",
  }
}

export const manualPaymentAdapter: PaymentAdapter = {
  gatewayName: "manual",
  initiatePayment,
  handleWebhook,
}
