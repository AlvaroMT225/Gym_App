import { NextRequest, NextResponse } from 'next/server';
import { requireRoleFromRequest } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';

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

    const supabase = await createClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No tienes un perfil de facturación activo' },
        { status: 400 }
      );
    }

    const returnUrl = `${request.headers.get('origin')}/dashboard/pagos`;

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}