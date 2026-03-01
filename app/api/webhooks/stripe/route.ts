import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      )
    }

    // TODO (Subfase 1.5): Verify signature with stripe.webhooks.constructEvent()
    // TODO (Subfase 1.5): Process events:
    // - checkout.session.completed -> activate membership
    // - invoice.paid -> register payment
    // - invoice.payment_failed -> mark failed payment
    // - customer.subscription.updated -> update plan
    // - customer.subscription.deleted -> cancel membership
    console.log("[Stripe Webhook] Received event", {
      signaturePresent: !!signature,
      bodyLength: body.length,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[Stripe Webhook] Error:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}
