import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { sendPINEmail, sendPaymentNotification } from "@/lib/email";
import { getStripeServer } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type BookingRecord = {
  id: string;
  provider_id: string;
  reference: string;
  deposit_amount: number;
  client_email?: string | null;
  confirmation_pin?: string | null;
  status: string;
  paid_at?: string | null;
  payment_intent_id?: string | null;
  stripe_payment_intent_id?: string | null;
  payment_intent?: string | null;
  stripe_payment_intent?: string | null;
};

type ProviderRecord = {
  email?: string | null;
  name?: string | null;
};

function getPaymentIntentId(booking: BookingRecord) {
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

function matchesBooking(paymentIntent: Stripe.PaymentIntent, booking: BookingRecord) {
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

async function findBookingForPaymentIntent(paymentIntent: Stripe.PaymentIntent) {
  const admin = createSupabaseAdminClient();
  const bookingId = paymentIntent.metadata?.booking_id?.trim();
  const bookingReference = paymentIntent.metadata?.booking_reference?.trim();

  if (bookingId) {
    const { data: booking, error } = await admin.from("bookings").select("*").eq("id", bookingId).maybeSingle();

    if (error) {
      throw error;
    }

    if (booking) {
      return booking as BookingRecord;
    }
  }

  if (bookingReference) {
    const { data: booking, error } = await admin
      .from("bookings")
      .select("*")
      .eq("reference", bookingReference)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (booking) {
      return booking as BookingRecord;
    }
  }

  const { data: booking, error } = await admin
    .from("bookings")
    .select("*")
    .eq("payment_intent_id", paymentIntent.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (booking as BookingRecord | null) ?? null;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("Stripe webhook secret is not configured.");
    return NextResponse.json({ error: "Webhook configuration error" }, { status: 500 });
  }

  const body = await request.text();

  let event: Stripe.Event;

  try {
    event = (await getStripeServer().webhooks.constructEvent(
      body,
      signature,
      webhookSecret,
    )) as Stripe.Event;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown signature verification error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  if (event.type !== "payment_intent.succeeded") {
    return NextResponse.json({ received: true });
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  try {
    const admin = createSupabaseAdminClient();
    const booking = await findBookingForPaymentIntent(paymentIntent);

    if (!booking) {
      console.error("Booking not found for payment intent:", paymentIntent.id);
      return NextResponse.json({ received: true });
    }

    if (!matchesBooking(paymentIntent, booking)) {
      console.error("Payment intent does not match booking:", {
        bookingId: booking.id,
        paymentIntentId: paymentIntent.id,
      });
      return NextResponse.json({ received: true });
    }

    if (booking.status.includes("cancelled") || booking.status === "completed") {
      console.error("Ignoring payment intent for non-payable booking:", {
        bookingId: booking.id,
        status: booking.status,
      });
      return NextResponse.json({ received: true });
    }

    const { data: existingTransaction, error: transactionLookupError } = await admin
      .from("transactions")
      .select("id")
      .eq("booking_id", booking.id)
      .eq("type", "payment")
      .eq("status", "completed")
      .maybeSingle();

    if (transactionLookupError) {
      throw transactionLookupError;
    }

    const wasAwaitingPayment = booking.status === "awaiting_payment";
    const updates: Record<string, string> = {};

    if (wasAwaitingPayment) {
      updates.status = "deposit_secured";
    }

    if (!booking.paid_at) {
      updates.paid_at = getPaidAtIsoString(paymentIntent);
    }

    if (getPaymentIntentId(booking) !== paymentIntent.id) {
      updates.payment_intent_id = paymentIntent.id;
    }

    let updatedBooking = booking;

    if (Object.keys(updates).length > 0) {
      const { data, error } = await admin
        .from("bookings")
        .update(updates)
        .eq("id", booking.id)
        .select("*")
        .single();

      if (error || !data) {
        throw error ?? new Error("Failed to update booking after payment");
      }

      updatedBooking = data as BookingRecord;
    }

    if (!existingTransaction) {
      const { error: transactionInsertError } = await admin.from("transactions").insert({
        booking_id: updatedBooking.id,
        type: "payment",
        amount: paymentIntent.amount,
        status: "completed",
      });

      if (transactionInsertError) {
        throw transactionInsertError;
      }
    }

    if (wasAwaitingPayment && !existingTransaction) {
      const { data: provider, error: providerError } = await admin
        .from("providers")
        .select("name, email")
        .eq("id", updatedBooking.provider_id)
        .single();

      if (providerError || !provider) {
        console.error("Failed to load provider for payment emails:", providerError);
      } else {
        const typedProvider = provider as ProviderRecord;
        const clientEmail = updatedBooking.client_email ?? paymentIntent.metadata?.client_email ?? null;
        const providerName = typedProvider.name?.trim() || "your provider";
        const providerEmail = typedProvider.email?.trim() || null;

        if (clientEmail && updatedBooking.confirmation_pin) {
          try {
            await sendPINEmail({
              to: clientEmail,
              bookingReference: updatedBooking.reference,
              pin: updatedBooking.confirmation_pin,
              providerName,
              depositAmount: updatedBooking.deposit_amount,
            });
          } catch (error) {
            console.error("Failed to send PIN email:", error);
          }
        } else {
          console.error("Skipping PIN email due to missing client email or confirmation PIN:", {
            bookingId: updatedBooking.id,
          });
        }

        if (providerEmail && clientEmail) {
          try {
            await sendPaymentNotification({
              to: providerEmail,
              bookingReference: updatedBooking.reference,
              clientEmail,
              depositAmount: updatedBooking.deposit_amount,
            });
          } catch (error) {
            console.error("Failed to send payment notification:", error);
          }
        } else {
          console.error("Skipping provider payment email due to missing provider or client email:", {
            bookingId: updatedBooking.id,
          });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error("Error processing Stripe webhook:", error);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }
}