import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export async function getOrCreateStripeCustomer({
  userId,
  email,
  name,
}: {
  userId: string;
  email: string;
  name?: string;
}): Promise<string> {
  // CORRECCIÓN: Se añadió 'await' aquí
  const supabase = await createClient();
  
  const { data } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (data?.stripe_customer_id) {
    return data.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      supabaseUUID: userId,
    },
  });

  await supabase
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId);

  return customer.id;
}

export async function createCheckoutSession({
  priceId,
  customerId,
  returnUrl,
}: {
  priceId: string;
  customerId: string;
  returnUrl: string;
}) {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: returnUrl,
    cancel_url: returnUrl,
  });

  if (!session.url) {
    throw new Error('Could not create checkout session.');
  }

  return session.url;
}