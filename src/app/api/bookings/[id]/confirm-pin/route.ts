import { NextResponse } from "next/server";

import {
  createSupabaseAdminClient,
  getSupabaseServerUser,
} from "@/lib/supabase/server";

type ConfirmPinRouteContext = {
  params: {
    id: string;
  };
};

type ConfirmPinRequestBody = {
  pin?: string;
};

type ConfirmPinBookingRecord = {
  id: string;
  provider_id: string;
  status: string;
  confirmation_pin: string;
  deposit_amount: number;
};

export async function POST(
  request: Request,
  { params }: ConfirmPinRouteContext,
) {
  try {
    const admin = createSupabaseAdminClient();
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

    let body: ConfirmPinRequestBody;

    try {
      body = (await request.json()) as ConfirmPinRequestBody;
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const pin = body.pin?.trim();

    if (!pin || !/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { error: "Please provide a valid 6-digit PIN" },
        { status: 400 },
      );
    }

    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select("id, provider_id, status, confirmation_pin, deposit_amount")
      .eq("id", params.id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const typedBooking = booking as ConfirmPinBookingRecord;

    if (typedBooking.provider_id !== provider.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (typedBooking.status !== "deposit_secured") {
      return NextResponse.json(
        { error: "Booking is not ready for PIN confirmation" },
        { status: 400 },
      );
    }

    if (typedBooking.confirmation_pin !== pin) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 400 });
    }

    const completedAt = new Date().toISOString();

    const { error: updateError } = await admin
      .from("bookings")
      .update({
        status: "completed",
        pin_used: true,
        pin_used_at: completedAt,
        completed_at: completedAt,
      })
      .eq("id", typedBooking.id);

    if (updateError) {
      throw updateError;
    }

    const { error: transactionError } = await admin.from("transactions").insert({
      booking_id: typedBooking.id,
      type: "payout",
      amount: typedBooking.deposit_amount,
      status: "completed",
    });

    if (transactionError) {
      throw transactionError;
    }

    return NextResponse.json({ success: true, bookingId: typedBooking.id });
  } catch (error: unknown) {
    console.error("Confirm PIN route error:", error);
    return NextResponse.json(
      { error: "Failed to confirm service" },
      { status: 500 },
    );
  }
}