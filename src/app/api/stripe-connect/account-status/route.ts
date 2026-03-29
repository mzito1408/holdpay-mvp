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

  return 'Failed to check account status';
}

export async function POST(request: Request) {
  try {
    const { account_id } = await request.json();

    if (!account_id) {
      return NextResponse.json({ error: 'Missing account_id' }, { status: 400 });
    }

    const account = await stripe.accounts.retrieve(account_id);

    const isComplete = account.details_submitted && account.payouts_enabled;

    if (isComplete) {
      const supabase = createSupabaseAdminClient();
      await supabase
        .from('providers')
        .update({ payout_enabled: true })
        .eq('stripe_account_id', account_id);
    }

    return NextResponse.json({
      details_submitted: account.details_submitted,
      payouts_enabled: account.payouts_enabled,
      charges_enabled: account.charges_enabled,
    });
  } catch (error: unknown) {
    console.error('[Stripe Connect] Status check error:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}