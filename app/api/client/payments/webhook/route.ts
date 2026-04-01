import { NextRequest, NextResponse } from "next/server"
import { getWebhookAdapter } from "@/lib/payment-adapters/registry"

function getPayloadGatewayName(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "manual"
  }

  const gatewayName = (payload as { gateway_name?: unknown; gateway?: unknown }).gateway_name
  if (typeof gatewayName === "string" && gatewayName.trim()) {
    return gatewayName.trim().toLowerCase()
  }

  const gateway = (payload as { gateway?: unknown }).gateway
  if (typeof gateway === "string" && gateway.trim()) {
    return gateway.trim().toLowerCase()
  }

  return "manual"
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    let payload: unknown = null

    if (rawBody) {
      try {
        payload = JSON.parse(rawBody)
      } catch {
        payload = { raw_body: rawBody }
      }
    }

    const gatewayName = getPayloadGatewayName(payload)
    const paymentAdapter = getWebhookAdapter(gatewayName)

    if (!paymentAdapter) {
      return NextResponse.json(
        {
          received: true,
          gateway_name: gatewayName,
          processed: false,
          status: "unsupported",
          message: "No adapter is configured yet for this payment gateway.",
        },
        { status: 202 }
      )
    }

    const result = await paymentAdapter.handleWebhook({
      payload,
      raw_body: rawBody,
      headers: request.headers,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("POST /api/client/payments/webhook unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
