import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Create payment intent is not implemented yet." },
    { status: 501 },
  );
}