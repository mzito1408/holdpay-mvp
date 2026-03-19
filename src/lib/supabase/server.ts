import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase server environment variables.");
  }

  return { url, anonKey };
}

export function createSupabaseServerClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = cookies() as ReturnType<typeof cookies> & {
    set?: (options: { name: string; value: string } & Record<string, unknown>) => void;
  };

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map(({ name, value }) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        if (!cookieStore.set) {
          return;
        }

        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set({ name, value, ...options });
        });
      },
    },
  });
}