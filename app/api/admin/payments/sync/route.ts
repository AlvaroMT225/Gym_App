import { NextRequest, NextResponse } from 'next/server';
import { requireRoleFromRequest } from '@/lib/auth/guards';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, [
    'ADMIN',
    'admin',
  ]);
  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  try {
    const balance = await stripe.balance.retrieve();
    return NextResponse.json({
      ok: true,
      message: 'Conexión con Stripe verificada.',
      balance: balance.available,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}