import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

type PublicBookingByReferenceRouteContext = {
  params: {
    reference: string;
  };
};

export async function GET(
  _request: Request,
  { params }: PublicBookingByReferenceRouteContext,
) {
  try {
    const reference = params.reference?.trim();

    if (!reference) {
      return NextResponse.json({ error: "Booking reference is required" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select(
        "id, provider_id, reference, deposit_amount, service_date, refund_policy, custom_refund_percentage, service_description, status",
      )
      .eq("reference", reference)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const { data: provider, error: providerError } = await admin
      .from("providers")
      .select("id, name")
      .eq("id", booking.provider_id)
      .single();

    if (providerError || !provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    return NextResponse.json({ booking, provider });
  } catch (error: unknown) {
    console.error("Load public booking by reference error:", error);
    return NextResponse.json({ error: "Failed to load booking" }, { status: 500 });
  }
}