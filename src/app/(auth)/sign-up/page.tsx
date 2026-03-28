"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { supabase } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const name = formData.name.trim();
    const email = formData.email.trim();
    const password = formData.password;

    if (!name) {
      setError("Please enter your full name.");
      setLoading(false);
      return;
    }

    if (!email) {
      setError("Please enter your email address.");
      setLoading(false);
      return;
    }

    try {
      console.log("[sign-up] Starting provider signup flow", { email, name });

      console.log("[sign-up] Step 1: creating Supabase auth user");
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      console.log("[sign-up] Step 1 result", {
        userId: signUpData.user?.id ?? null,
        hasSession: Boolean(signUpData.session),
      });

      if (signUpError) {
        console.log("[sign-up] Step 1 failed", signUpError);
        setError(`Auth signup failed: ${signUpError.message}`);
        return;
      }

      if (!signUpData.user?.id) {
        console.log("[sign-up] Step 1 returned no user id");
        setError("Auth signup failed: Supabase did not return a user record.");
        return;
      }

      console.log("[sign-up] Step 2: inserting provider record", {
        userId: signUpData.user.id,
        email,
        name,
      });

      const { error: providerError } = await supabase.from("providers").insert({
        user_id: signUpData.user.id,
        email,
        name,
      });

      if (providerError) {
        console.log("[sign-up] Step 2 failed", providerError);
        setError(`Provider profile creation failed: ${providerError.message}`);
        return;
      }

      console.log("[sign-up] Step 2 succeeded");
      console.log("[sign-up] Signup complete, redirecting to dashboard");
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      console.error("Signup error:", err);
      const message = err instanceof Error ? err.message : "Failed to create account";
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
          <h1 className="text-[28px] font-bold">Create Provider Account</h1>
          <p className="mt-2 text-slate-500">Start accepting secure deposits</p>
        </div>

        <div className="rounded-[20px] border border-slate-200 bg-white p-8 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
          <form onSubmit={handleSubmit}>
            {error ? (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Smith"
              className="mb-5 w-full rounded-xl border border-slate-200 px-4 py-4 text-base outline-none transition focus:border-sky-500"
            />

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
            <div className="relative mb-5">
              <input
                id="password"
                type="password"
                required
                minLength={6}
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

            <label
              htmlFor="confirm-password"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Confirm Password
            </label>
            <div className="relative mb-6">
              <input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 px-4 py-4 pr-12 text-base outline-none transition focus:border-sky-500"
              />
              <button
                type="button"
                aria-label="Toggle confirm password visibility"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                onClick={() => {
                  const field = document.getElementById("confirm-password") as HTMLInputElement | null;
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

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-sky-500 px-4 py-4 text-base font-semibold text-white transition hover:bg-sky-600 disabled:opacity-50"
            >
              {loading ? "Creating Account..." : "Sign Up"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-semibold text-sky-500">
              Sign in
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