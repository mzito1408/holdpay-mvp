import { NextResponse } from "next/server";

import {
  createSupabaseAdminClient,
  getSupabaseServerUser,
} from "@/lib/supabase/server";

type BookingByReferenceRouteContext = {
  params: {
    reference: string;
  };
};

export async function GET(
  _request: Request,
  { params }: BookingByReferenceRouteContext,
) {
  try {
    const reference = params.reference?.trim();

    if (!reference) {
      return NextResponse.json({ error: "Booking reference is required" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const user = await getSupabaseServerUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: provider, error: providerError } = await admin
      .from("providers")
      .select("id, name, user_id")
      .eq("user_id", user.id)
      .single();

    if (providerError || !provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 403 });
    }

    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select(
        "id, provider_id, reference, deposit_amount, client_email, service_date, refund_policy, custom_refund_percentage, status, created_at, paid_at, completed_at",
      )
      .eq("reference", reference)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.provider_id !== provider.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ booking, provider });
  } catch (error: unknown) {
    console.error("Load provider booking by reference error:", error);
    return NextResponse.json({ error: "Failed to load booking" }, { status: 500 });
  }
}