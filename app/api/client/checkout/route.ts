import { NextRequest, NextResponse } from 'next/server';
import { requireRoleFromRequest } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { getPriceIdForPlan } from '@/lib/stripe';
import {
  createCheckoutSession,
  getOrCreateStripeCustomer,
} from '@/lib/stripe-helpers';

export async function POST(request: NextRequest) {
  try {
    const sessionOrResponse = await requireRoleFromRequest(request, [
      'USER',
      'athlete',
    ]);
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }
    const { userId } = sessionOrResponse;

    const { planType } = await request.json();

    const supabase = await createClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile || !profile.email) {
      throw new Error(`Could not retrieve profile for user ${userId}`);
    }

    const priceId = getPriceIdForPlan(planType);

    const customerId = await getOrCreateStripeCustomer({
      userId,
      email: profile.email,
      name: `${profile.first_name} ${profile.last_name}`,
    });

    const returnUrl = `${request.headers.get('origin')}/dashboard`;

    const url = await createCheckoutSession({
      priceId,
      customerId,
      returnUrl,
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
