import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripeServer } from "@/lib/stripe-server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type FinalizePaymentBody = {
  reference?: string;
  payment_intent_id?: string;
};

type BookingWithPaymentData = {
  id: string;
  reference: string;
  deposit_amount: number;
  status: string;
  paid_at?: string | null;
  payment_intent_id?: string | null;
  stripe_payment_intent_id?: string | null;
  payment_intent?: string | null;
  stripe_payment_intent?: string | null;
};

function getPaymentIntentId(booking: BookingWithPaymentData) {
  const candidates = [
    booking.payment_intent_id,
    booking.stripe_payment_intent_id,
    booking.payment_intent,
    booking.stripe_payment_intent,
  ];

  return (
    candidates.find(
      (value): value is string => typeof value === "string" && value.length > 0,
    ) ?? null
  );
}

function matchesBooking(paymentIntent: Stripe.PaymentIntent, booking: BookingWithPaymentData) {
  const metadata = paymentIntent.metadata ?? {};

  if (metadata.booking_id && metadata.booking_id !== booking.id) {
    return false;
  }

  if (metadata.booking_reference && metadata.booking_reference !== booking.reference) {
    return false;
  }

  return paymentIntent.amount === booking.deposit_amount;
}

function getPaidAtIsoString(paymentIntent: Stripe.PaymentIntent) {
  const latestCharge = paymentIntent.latest_charge;

  if (
    latestCharge &&
    typeof latestCharge !== "string" &&
    typeof latestCharge.created === "number"
  ) {
    return new Date(latestCharge.created * 1000).toISOString();
  }

  return new Date(paymentIntent.created * 1000).toISOString();
}

export async function POST(request: Request) {
  try {
    let body: FinalizePaymentBody;

    try {
      body = (await request.json()) as FinalizePaymentBody;
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const reference = body.reference?.trim();
    const requestedPaymentIntentId = body.payment_intent_id?.trim();

    if (!reference) {
      return NextResponse.json({ error: "Booking reference is required" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select("*")
      .eq("reference", reference)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const typedBooking = booking as BookingWithPaymentData;

    if (typedBooking.status.includes("cancelled") || typedBooking.status === "completed") {
      return NextResponse.json({ booking });
    }

    const paymentIntentId = requestedPaymentIntentId || getPaymentIntentId(typedBooking);

    if (!paymentIntentId) {
      return NextResponse.json({ booking });
    }

    const paymentIntent = await getStripeServer().paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    });

    if (!matchesBooking(paymentIntent, typedBooking)) {
      return NextResponse.json({ error: "Payment does not match this booking" }, { status: 400 });
    }

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json({ booking });
    }

    const updates: Record<string, string> = {};

    if (typedBooking.status === "awaiting_payment") {
      updates.status = "deposit_secured";
    }

    if (!typedBooking.paid_at) {
      updates.paid_at = getPaidAtIsoString(paymentIntent);
    }

    if (typedBooking.payment_intent_id !== paymentIntent.id) {
      updates.payment_intent_id = paymentIntent.id;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ booking });
    }

    const { data: updatedBooking, error: updateError } = await admin
      .from("bookings")
      .update(updates)
      .eq("id", typedBooking.id)
      .select("*")
      .single();

    if (updateError || !updatedBooking) {
      throw updateError ?? new Error("Failed to update booking");
    }

    return NextResponse.json({ booking: updatedBooking });
  } catch (error: unknown) {
    console.error("Finalize payment error:", error);
    return NextResponse.json({ error: "Failed to finalize payment" }, { status: 500 });
  }
}