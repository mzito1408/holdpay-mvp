import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
});

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Failed to create account';
}

export async function POST(request: Request) {
  try {
    const { provider_id } = await request.json();

    if (!provider_id) {
      return NextResponse.json({ error: 'Missing provider_id' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    const { data: provider } = await supabase
      .from('providers')
      .select('*')
      .eq('id', provider_id)
      .single();

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: provider.email,
      capabilities: {
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: {
        provider_id: provider.id,
        provider_name: provider.name,
      },
    });

    await supabase
      .from('providers')
      .update({ stripe_account_id: account.id })
      .eq('id', provider_id);

    console.log('[Stripe Connect] Account created:', account.id);

    return NextResponse.json({ account_id: account.id });
  } catch (error: unknown) {
    console.error('[Stripe Connect] Create account error:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}