"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { supabase } from "@/lib/supabase/client";

export default function SignInPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const email = formData.email.trim();
    const password = formData.password;

    try {
      console.log("[sign-in] Starting sign-in flow", { email });
      console.log("[sign-in] Calling supabase.auth.signInWithPassword");

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.log("[sign-in] Sign-in failed", {
          message: signInError.message,
          name: signInError.name,
          status: "status" in signInError ? signInError.status : undefined,
        });
        setError(signInError.message);
        return;
      }

      console.log("[sign-in] Sign-in succeeded", {
        userId: signInData.user?.id ?? null,
        hasSession: Boolean(signInData.session),
      });

      if (signInData?.user) {
        console.log("[sign-in] Sign-in successful, redirecting...");
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setError("Sign-in succeeded but no user was returned.");
    } catch (err: unknown) {
      console.error("[sign-in] Unexpected sign-in error:", err);
      const message = err instanceof Error ? err.message : "Failed to sign in";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <nav className="sticky top-0 z-10 flex h-[60px] items-center justify-center border-b border-slate-200 bg-white">
        <div className="text-[22px] font-bold tracking-[-0.5px]">
          <span className="text-slate-800">Hold</span>
          <span className="text-sky-500">Pay</span>
        </div>
      </nav>

      <div className="mx-auto w-full max-w-[480px] px-6 py-6">
        <div className="mb-8 text-center">
          <h1 className="text-[28px] font-bold">Sign In</h1>
          <p className="mt-2 text-slate-500">Access your provider dashboard</p>
        </div>

        <div className="rounded-[20px] border border-slate-200 bg-white p-8 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
          <form onSubmit={handleSubmit}>
            {error ? (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="you@email.com"
              className="mb-5 w-full rounded-xl border border-slate-200 px-4 py-4 text-base outline-none transition focus:border-sky-500"
            />

            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
              Password
            </label>
            <div className="relative mb-2">
              <input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 px-4 py-4 pr-12 text-base outline-none transition focus:border-sky-500"
              />
              <button
                type="button"
                aria-label="Toggle password visibility"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                onClick={() => {
                  const field = document.getElementById("password") as HTMLInputElement | null;
                  if (!field) return;
                  field.type = field.type === "password" ? "text" : "password";
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-2 text-right">
              <button type="button" className="text-sm text-sky-500">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-sky-500 px-4 py-4 text-base font-semibold text-white transition hover:bg-sky-600 disabled:opacity-50"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="font-semibold text-sky-500">
              Sign up
            </Link>
          </p>
        </div>

        <footer className="mt-8 text-center text-[13px] text-slate-500">
          © 2026 HoldPay. Simply the tool for booking deposits.
        </footer>
      </div>
    </div>
  );
}