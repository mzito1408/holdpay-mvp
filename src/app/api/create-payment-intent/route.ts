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

  return 'Failed to create payment intent';
}

export async function POST(request: Request) {
  try {
    const { booking_id, email } = await request.json();

    if (!booking_id || !email) {
      return NextResponse.json(
        { error: 'Missing booking_id or email' },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 },
      );
    }

    if (booking.status !== 'awaiting_payment') {
      return NextResponse.json(
        { error: 'Booking already paid or cancelled' },
        { status: 400 },
      );
    }

    if (booking.payment_intent_id) {
      try {
        const existingIntent = await stripe.paymentIntents.retrieve(
          booking.payment_intent_id,
        );

        if (
          existingIntent.status === 'requires_payment_method' ||
          existingIntent.status === 'requires_confirmation'
        ) {
          console.log('[Payment Intent] Reusing existing:', existingIntent.id);
          return NextResponse.json({
            clientSecret: existingIntent.client_secret,
          });
        }
      } catch {
        console.log('[Payment Intent] Existing intent invalid, creating new');
      }
    }

    const idempotencyKey = `booking-${booking_id}-${Date.now()}`;

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: booking.deposit_amount,
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          booking_id: booking.id,
          booking_reference: booking.reference,
          client_email: email,
        },
        description: `Booking deposit - ${booking.reference}`,
      },
      {
        idempotencyKey,
      },
    );

    await supabase
      .from('bookings')
      .update({
        payment_intent_id: paymentIntent.id,
        client_email: email,
        policy_accepted_at: new Date().toISOString(),
      })
      .eq('id', booking_id);

    console.log('[Payment Intent] Created:', paymentIntent.id);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error: unknown) {
    console.error('[Payment Intent] Error:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}