import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripeServer } from "@/lib/stripe";
import { calculateRefund } from "@/lib/utils";
import {
  createSupabaseAdminClient,
  getSupabaseServerUser,
} from "@/lib/supabase/server";

type CancelBookingRouteContext = {
  params: {
    id: string;
  };
};

type CancelBookingRequestBody = {
  cancelled_by?: string;
  payment_intent_id?: string;
};

type CancellationType = "provider" | "client" | "client_early";

type BookingWithPaymentData = {
  id: string;
  provider_id: string;
  reference?: string;
  status: string;
  deposit_amount: number;
  paid_at?: string | null;
  refund_policy?: string | null;
  custom_refund_percentage?: number | null;
  [key: string]: unknown;
};

function isCancellationType(value: string | undefined): value is CancellationType {
  return value === "provider" || value === "client" || value === "client_early";
}

function getCancellationStatus(cancelledBy: CancellationType) {
  if (cancelledBy === "provider") {
    return "cancelled_provider";
  }

  if (cancelledBy === "client_early") {
    return "cancelled_client_early";
  }

  return "cancelled_client";
}

function getRefundAmount(booking: BookingWithPaymentData, cancelledBy: CancellationType) {
  if (booking.status !== "deposit_secured") {
    return 0;
  }

  if (cancelledBy === "provider" || cancelledBy === "client_early") {
    return booking.deposit_amount;
  }

  return calculateRefund(
    booking.deposit_amount,
    booking.refund_policy ?? "none",
    booking.custom_refund_percentage ?? undefined,
  );
}

function getPaymentIntentId(booking: BookingWithPaymentData) {
  const candidates = [
    booking.payment_intent_id,
    booking.stripe_payment_intent_id,
    booking.payment_intent,
    booking.stripe_payment_intent,
  ];

  const match = candidates.find(
    (value): value is string => typeof value === "string" && value.length > 0,
  );

  return match ?? null;
}

function isWithinClientCancelWindow(value: unknown) {
  if (typeof value !== "string") {
    return false;
  }

  const paidAt = new Date(value).getTime();

  if (Number.isNaN(paidAt)) {
    return false;
  }

  return Date.now() - paidAt <= 60_000;
}

function matchesBooking(paymentIntent: Stripe.PaymentIntent, booking: BookingWithPaymentData) {
  const metadata = paymentIntent.metadata ?? {};

  if (metadata.booking_id && metadata.booking_id !== booking.id) {
    return false;
  }

  if (
    metadata.booking_reference &&
    typeof booking.reference === "string" &&
    metadata.booking_reference !== booking.reference
  ) {
    return false;
  }

  return true;
}

export async function POST(
  request: Request,
  { params }: CancelBookingRouteContext,
) {
  try {
    const admin = createSupabaseAdminClient();

    let body: CancelBookingRequestBody = {};

    try {
      body = (await request.json()) as CancelBookingRequestBody;
    } catch {
      body = {};
    }

    if (!isCancellationType(body.cancelled_by)) {
      return NextResponse.json(
        { error: "Invalid cancellation type" },
        { status: 400 },
      );
    }

    const cancelledBy = body.cancelled_by;
    const isProviderCancellation = cancelledBy === "provider";
    const isClientEarlyCancellation = cancelledBy === "client_early";

    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select("*")
      .eq("id", params.id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const typedBooking = booking as BookingWithPaymentData;

    if (isProviderCancellation) {
      const user = await getSupabaseServerUser();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { data: provider, error: providerError } = await admin
        .from("providers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (providerError || !provider) {
        return NextResponse.json({ error: "Provider not found" }, { status: 403 });
      }

      if (typedBooking.provider_id !== provider.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (!["awaiting_payment", "deposit_secured"].includes(typedBooking.status)) {
        return NextResponse.json(
          { error: "Booking can no longer be cancelled" },
          { status: 400 },
        );
      }
    } else if (isClientEarlyCancellation) {
      if (typedBooking.status !== "deposit_secured") {
        return NextResponse.json(
          { error: "Booking is not eligible for the quick cancel refund window" },
          { status: 400 },
        );
      }

      if (!isWithinClientCancelWindow(typedBooking.paid_at)) {
        return NextResponse.json(
          { error: "The 60-second full refund window has expired" },
          { status: 400 },
        );
      }
    } else {
      if (!["awaiting_payment", "deposit_secured"].includes(typedBooking.status)) {
        return NextResponse.json(
          { error: "Booking can no longer be cancelled" },
          { status: 400 },
        );
      }
    }

    const refundAmount = getRefundAmount(typedBooking, cancelledBy);
    const cancelledAt = new Date().toISOString();

    if (refundAmount > 0) {
      const paymentIntentId = body.payment_intent_id?.trim() || getPaymentIntentId(typedBooking);

      if (!paymentIntentId) {
        return NextResponse.json(
          {
            error: "Cannot issue a refund because no Stripe payment intent is stored for this booking.",
          },
          { status: 400 },
        );
      }

      const paymentIntent = await getStripeServer().paymentIntents.retrieve(paymentIntentId);

      if (!matchesBooking(paymentIntent, typedBooking)) {
        return NextResponse.json(
          { error: "Payment intent does not match this booking" },
          { status: 400 },
        );
      }

      await getStripeServer().refunds.create({
        payment_intent: paymentIntent.id,
        amount: refundAmount,
        reason: "requested_by_customer",
      });

      const { error: transactionError } = await admin.from("transactions").insert({
        booking_id: typedBooking.id,
        type: "refund",
        amount: refundAmount,
        status: "completed",
      });

      if (transactionError) {
        throw transactionError;
      }
    }

    const { error: updateError } = await admin
      .from("bookings")
      .update({
        status: getCancellationStatus(cancelledBy),
        cancelled_at: cancelledAt,
      })
      .eq("id", typedBooking.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      bookingId: typedBooking.id,
      refund_amount: refundAmount,
    });
  } catch (error: unknown) {
    console.error("Cancel booking route error:", error);
    return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });
  }
}