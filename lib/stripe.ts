import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('La variable de entorno STRIPE_SECRET_KEY no está definida.');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-02-25.clover',
  typescript: true,
});

export const PLAN_PRICE_MAP: Record<string, string> = {
  basic: process.env.STRIPE_PRICE_BASIC || '',
  premium: process.env.STRIPE_PRICE_PREMIUM || '',
  vip: process.env.STRIPE_PRICE_VIP || '',
  custom: process.env.STRIPE_PRICE_CUSTOM || '',
};

export function getPriceIdForPlan(planType: string): string {
  const priceId = PLAN_PRICE_MAP[planType];

  if (!priceId) {
    throw new Error(`No se encontró un ID de precio para el plan: ${planType}`);
  }

  return priceId;
}
