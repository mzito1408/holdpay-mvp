import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

function getStringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const admin = createSupabaseAdminClient();

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = getStringField(body.name);
    const email = getStringField(body.email).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 },
      );
    }

    const { data: authData, error: createUserError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createUserError || !authData.user) {
      const message = createUserError?.message ?? "Failed to create auth user";
      const status = message.toLowerCase().includes("already") ? 409 : 400;
      return NextResponse.json({ error: message }, { status });
    }

    const { error: providerInsertError } = await admin.from("providers").insert({
      user_id: authData.user.id,
      email,
      name,
    });

    if (providerInsertError) {
      try {
        await admin.auth.admin.deleteUser(authData.user.id);
      } catch (cleanupError) {
        console.error("Failed to clean up auth user after provider insert error:", cleanupError);
      }

      throw providerInsertError;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Sign-up route error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create account" },
      { status: 500 },
    );
  }
}