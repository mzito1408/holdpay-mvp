import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Stripe webhook handling is not implemented yet." },
    { status: 501 },
  );
}