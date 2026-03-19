import { NextResponse } from "next/server";

import { getStripeServer } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type CreatePaymentIntentBody = {
  booking_id?: string;
  email?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    let body: CreatePaymentIntentBody;

    try {
      body = (await request.json()) as CreatePaymentIntentBody;
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const bookingId = body.booking_id?.trim();
    const email = body.email?.trim().toLowerCase();

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdminClient();

    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select("id, reference, deposit_amount, status")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status !== "awaiting_payment") {
      return NextResponse.json(
        { error: "This booking is no longer available for payment" },
        { status: 400 },
      );
    }

    if (!Number.isInteger(booking.deposit_amount) || booking.deposit_amount <= 0) {
      return NextResponse.json(
        { error: "Booking has an invalid deposit amount" },
        { status: 400 },
      );
    }

    const paymentIntent = await getStripeServer().paymentIntents.create({
      amount: booking.deposit_amount,
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
      description: `HoldPay deposit for booking ${booking.reference}`,
      metadata: {
        booking_id: booking.id,
        booking_reference: booking.reference,
        client_email: email,
      },
    });

    if (!paymentIntent.client_secret) {
      throw new Error("Stripe did not return a client secret");
    }

    const { error: updateError } = await admin
      .from("bookings")
      .update({
        client_email: email,
        payment_intent_id: paymentIntent.id,
        policy_accepted_at: new Date().toISOString(),
      })
      .eq("id", booking.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: unknown) {
    console.error("Create payment intent error:", error);
    return NextResponse.json(
      { error: "Failed to initialize payment" },
      { status: 500 },
    );
  }
}