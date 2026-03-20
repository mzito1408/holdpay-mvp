import { NextResponse } from "next/server";

import { createSupabaseAdminClient, getSupabaseServerUser } from "@/lib/supabase/server";

function getDisplayName(user: { email?: string | null; user_metadata?: unknown }) {
  if (typeof user.user_metadata === "object" && user.user_metadata !== null) {
    const name = (user.user_metadata as Record<string, unknown>).name;
    if (typeof name === "string" && name.trim()) {
      return name.trim();
    }
  }

  return user.email?.trim() || "Provider";
}

export async function POST() {
  try {
    const admin = createSupabaseAdminClient();
    const user = await getSupabaseServerUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: existingProvider, error: lookupError } = await admin
      .from("providers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    if (!existingProvider) {
      const { error: insertError } = await admin.from("providers").insert({
        user_id: user.id,
        email: user.email,
        name: getDisplayName(user),
      });

      if (insertError) {
        throw insertError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Ensure provider route error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to prepare account" },
      { status: 500 },
    );
  }
}