import { NextResponse } from "next/server";

type CancelBookingRouteContext = {
  params: {
    id: string;
  };
};

export async function POST(
  _request: Request,
  { params }: CancelBookingRouteContext,
) {
  return NextResponse.json(
    {
      bookingId: params.id,
      error: "Booking cancellation is not implemented yet.",
    },
    { status: 501 },
  );
}