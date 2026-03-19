import { NextResponse } from "next/server";

type ConfirmPinRouteContext = {
  params: {
    id: string;
  };
};

export async function POST(
  _request: Request,
  { params }: ConfirmPinRouteContext,
) {
  return NextResponse.json(
    {
      bookingId: params.id,
      error: "PIN confirmation is not implemented yet.",
    },
    { status: 501 },
  );
}