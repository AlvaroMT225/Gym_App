import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/supabase/service';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('Missing Stripe signature or webhook secret.');
    }

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    const supabaseAdmin = createServiceRoleClient();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('[Webhook] Sesión completada:', session.id);

        const userId = session.metadata?.supabaseUUID;
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        if (!userId || !customerId || !subscriptionId) {
          console.error(
            '[Webhook Error] Faltan metadatos cruciales en la sesión de checkout:',
            session.id
          );
          break;
        }

        await supabaseAdmin
          .from('profiles')
          .update({ stripe_customer_id: customerId as string })
          .eq('id', userId);

        await supabaseAdmin
          .from('memberships')
          .update({
            status: 'active',
            stripe_subscription_id: subscriptionId as string,
          })
          .eq('profile_id', userId);
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('[Webhook] Factura pagada:', invoice.id);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('[Webhook] Pago fallido:', invoice.id);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('[Webhook] Suscripción actualizada:', subscription.id);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('[Webhook] Suscripción cancelada:', subscription.id);

        const subscriptionId = subscription.id;

        await supabaseAdmin
          .from('memberships')
          .update({ status: 'inactive' })
          .eq('stripe_subscription_id', subscriptionId);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
      return new NextResponse('Invalid signature', { status: 400 });
    }
    console.error(error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
