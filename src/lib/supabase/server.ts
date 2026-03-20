import { createClient, type AuthUser } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const BASE64_PREFIX = "base64-";

type SupabaseSessionCookie = {
  access_token?: unknown;
};

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing Supabase server environment variable: ${name}`);
  }

  return value;
}

function getSupabaseAuthCookieName(supabaseUrl: string) {
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  return `sb-${projectRef}-auth-token`;
}

function readChunkedCookie(cookieName: string) {
  const cookieStore = cookies();
  const directValue = cookieStore.get(cookieName)?.value;

  if (directValue) {
    return directValue;
  }

  const chunks: string[] = [];

  for (let index = 0; ; index += 1) {
    const chunkValue = cookieStore.get(`${cookieName}.${index}`)?.value;

    if (!chunkValue) {
      break;
    }

    chunks.push(chunkValue);
  }

  return chunks.length > 0 ? chunks.join("") : null;
}

function decodeSupabaseCookieValue(value: string) {
  if (!value.startsWith(BASE64_PREFIX)) {
    return value;
  }

  return Buffer.from(value.slice(BASE64_PREFIX.length), "base64url").toString("utf8");
}

function getSupabaseSessionFromCookies() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const cookieName = getSupabaseAuthCookieName(supabaseUrl);
  const rawCookieValue = readChunkedCookie(cookieName);

  if (!rawCookieValue) {
    return null;
  }

  try {
    return JSON.parse(decodeSupabaseCookieValue(rawCookieValue)) as SupabaseSessionCookie;
  } catch (error: unknown) {
    console.error("Failed to parse Supabase auth cookie:", error);
    return null;
  }
}

function getSupabaseAccessToken() {
  const session = getSupabaseSessionFromCookies();

  return typeof session?.access_token === "string" && session.access_token.length > 0
    ? session.access_token
    : null;
}

export function createSupabaseServerClient() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createClient(url, anonKey, {
    accessToken: async () => getSupabaseAccessToken(),
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export async function getSupabaseServerUser(): Promise<AuthUser | null> {
  const accessToken = getSupabaseAccessToken();

  if (!accessToken) {
    return null;
  }

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const response = await fetch(new URL("auth/v1/user", url), {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load Supabase user (${response.status})`);
  }

  const payload = (await response.json()) as { user?: AuthUser | null };
  return payload.user ?? null;
}

export function createSupabaseAdminClient() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}