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

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { name: formData.name },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        },
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error("No user returned from signup");
      }

      const { error: providerError } = await supabase.from("providers").insert({
        user_id: authData.user.id,
        email: formData.email,
        name: formData.name,
      });

      if (providerError) {
        throw providerError;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      console.error("Signup error:", err);
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 p-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">
            Create Provider Account
          </h1>
          <p className="mt-2 text-center text-gray-600">
            Start accepting secure deposits
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error ? (
            <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              {error}
            </div>
          ) : null}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>

          <p className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}