import { NextResponse } from "next/server";
import Stripe from "stripe";

import {
  createSupabaseAdminClient,
  getSupabaseServerUser,
} from "@/lib/supabase/server";
import { calculateFees } from "@/lib/utils";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

type ConfirmPinRouteContext = {
  params: {
    id: string;
  };
};

type ConfirmPinRequestBody = {
  pin?: string;
};

type ProviderRecord = {
  id: string;
  name: string;
  email: string;
  stripe_account_id: string | null;
  payout_enabled: boolean | null;
};

type BookingRecord = {
  id: string;
  provider_id: string;
  reference: string;
  status: string;
  confirmation_pin: string;
  pin_used: boolean | null;
  pin_locked_until: string | null;
  pin_attempts: number | null;
  deposit_amount: number;
  providers: ProviderRecord | ProviderRecord[] | null;
};

type PinAttemptUpdates = {
  pin_attempts: number;
  pin_locked_until?: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export async function POST(
  request: Request,
  { params }: ConfirmPinRouteContext,
) {
  try {
    const user = await getSupabaseServerUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: ConfirmPinRequestBody;

    try {
      body = (await request.json()) as ConfirmPinRequestBody;
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const pin = body.pin?.trim();
    const bookingId = params.id;

    if (!pin || pin.length !== 6) {
      return NextResponse.json(
        { error: "Invalid PIN format" },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: currentProvider, error: currentProviderError } = await supabase
      .from("providers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (currentProviderError || !currentProvider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 403 });
    }

    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(
        `
        *,
        providers (
          id,
          name,
          email,
          stripe_account_id,
          payout_enabled
        )
      `,
      )
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 },
      );
    }

    const typedBooking = booking as BookingRecord;

    if (typedBooking.provider_id !== currentProvider.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const provider = Array.isArray(typedBooking.providers)
      ? typedBooking.providers[0]
      : typedBooking.providers;

    if (typedBooking.status !== "deposit_secured") {
      return NextResponse.json(
        { error: "Booking must be in deposit_secured status" },
        { status: 400 },
      );
    }

    if (typedBooking.pin_used) {
      return NextResponse.json(
        { error: "PIN already used" },
        { status: 400 },
      );
    }

    if (typedBooking.pin_locked_until) {
      const lockUntil = new Date(typedBooking.pin_locked_until);
      if (lockUntil > new Date()) {
        return NextResponse.json(
          { error: "Too many attempts. Try again in 15 minutes." },
          { status: 429 },
        );
      }
    }

    if (typedBooking.confirmation_pin !== pin) {
      const newAttempts = (typedBooking.pin_attempts || 0) + 1;

      const updates: PinAttemptUpdates = {
        pin_attempts: newAttempts,
      };

      if (newAttempts >= 5) {
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        updates.pin_locked_until = lockUntil.toISOString();
      }

      await supabase.from("bookings").update(updates).eq("id", bookingId);

      return NextResponse.json(
        {
          error: "Incorrect PIN",
          attemptsRemaining: Math.max(0, 5 - newAttempts),
        },
        { status: 401 },
      );
    }

    if (!provider?.payout_enabled || !provider?.stripe_account_id) {
      return NextResponse.json(
        { error: "Provider must complete payout setup first" },
        { status: 400 },
      );
    }

    const fees = calculateFees(typedBooking.deposit_amount);

    let transfer: Stripe.Response<Stripe.Transfer>;
    try {
      transfer = await stripe.transfers.create({
        amount: fees.netToProvider,
        currency: "usd",
        destination: provider.stripe_account_id,
        transfer_group: typedBooking.reference,
        description: `Booking ${typedBooking.reference} - ${provider.name}`,
        metadata: {
          booking_id: typedBooking.id,
          booking_reference: typedBooking.reference,
          provider_id: provider.id,
          deposit_amount: fees.depositAmount.toString(),
          stripe_fee: fees.stripeFee.toString(),
          holdpay_fee: fees.holdpayFee.toString(),
        },
      });

      console.log("[Payout] Transfer created:", transfer.id);
    } catch (stripeError: unknown) {
      console.error("[Payout] Stripe transfer failed:", stripeError);
      return NextResponse.json(
        { error: "Payout failed. Please contact support." },
        { status: 500 },
      );
    }

    const completedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "completed",
        pin_used: true,
        pin_used_at: completedAt,
        completed_at: completedAt,
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("[Payout] Booking update failed:", updateError);
      return NextResponse.json(
        { error: `Status update failed. Transfer created: ${transfer.id}` },
        { status: 500 },
      );
    }

    await supabase.from("transactions").insert({
      booking_id: typedBooking.id,
      type: "payout",
      amount: fees.netToProvider,
      stripe_transaction_id: transfer.id,
      status: "completed",
    });

    return NextResponse.json({
      success: true,
      transfer_id: transfer.id,
      net_amount: fees.netToProvider,
      message: "Payment released successfully",
    });
  } catch (error: unknown) {
    console.error("[PIN Confirm] Error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}