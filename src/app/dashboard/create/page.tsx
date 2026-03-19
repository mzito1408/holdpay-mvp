"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { supabase } from "@/lib/supabase/client";
import { dollarsToCents, generatePIN, generateReference } from "@/lib/utils";

type RefundPolicy = "none" | "25" | "50" | "custom";

function isRefundPolicy(value: string): value is RefundPolicy {
  return ["none", "25", "50", "custom"].includes(value);
}

export default function CreateBookingPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    amount: "",
    serviceDate: "",
    refundPolicy: "none" as RefundPolicy,
    customPercentage: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Not authenticated");
      }

      const { data: provider, error: providerError } = await supabase
        .from("providers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (providerError || !provider) {
        throw new Error("Provider not found");
      }

      const amount = parseFloat(formData.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Deposit amount must be greater than 0");
      }

      let customRefundPercentage: number | null = null;
      if (formData.refundPolicy === "custom") {
        const percentage = parseInt(formData.customPercentage, 10);
        if (Number.isNaN(percentage) || percentage < 0 || percentage > 100) {
          throw new Error("Custom percentage must be between 0 and 100");
        }
        customRefundPercentage = percentage;
      }

      const reference = generateReference();
      const pin = generatePIN();

      const { error: insertError } = await supabase.from("bookings").insert({
        provider_id: provider.id,
        reference,
        deposit_amount: dollarsToCents(amount),
        service_date: formData.serviceDate || null,
        refund_policy: formData.refundPolicy,
        custom_refund_percentage: customRefundPercentage,
        confirmation_pin: pin,
        status: "awaiting_payment",
      });

      if (insertError) {
        throw insertError;
      }

      router.push(`/booking/${reference}`);
    } catch (err: unknown) {
      console.error("Create booking error:", err);
      setError(err instanceof Error ? err.message : "Failed to create booking");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Booking</h1>
          <p className="mt-2 text-gray-600">
            Set up a new deposit request for your client
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          {error ? (
            <div className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                Deposit Amount ($) *
              </label>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="1"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="100.00"
              />
              <p className="mt-1 text-sm text-gray-500">
                The amount your client will pay as a deposit
              </p>
            </div>

            <div>
              <label
                htmlFor="serviceDate"
                className="block text-sm font-medium text-gray-700"
              >
                Service Date (optional)
              </label>
              <input
                id="serviceDate"
                type="date"
                value={formData.serviceDate}
                onChange={(e) => setFormData({ ...formData, serviceDate: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="refundPolicy"
                className="block text-sm font-medium text-gray-700"
              >
                Cancellation Refund Policy *
              </label>
              <select
                id="refundPolicy"
                value={formData.refundPolicy}
                onChange={(e) => {
                  const refundPolicy = isRefundPolicy(e.target.value)
                    ? e.target.value
                    : "none";

                  setFormData({
                    ...formData,
                    refundPolicy,
                    customPercentage: "",
                  });
                }}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              >
                <option value="none">No Refund (Non-refundable)</option>
                <option value="25">25% Refund</option>
                <option value="50">50% Refund</option>
                <option value="custom">Custom Percentage</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                What the client receives if they cancel before service
              </p>
            </div>

            {formData.refundPolicy === "custom" ? (
              <div>
                <label
                  htmlFor="customPercentage"
                  className="block text-sm font-medium text-gray-700"
                >
                  Custom Refund Percentage *
                </label>
                <input
                  id="customPercentage"
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={formData.customPercentage}
                  onChange={(e) =>
                    setFormData({ ...formData, customPercentage: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="75"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Enter a percentage between 0 and 100
                </p>
              </div>
            ) : null}

            <div className="flex items-center justify-between border-t pt-6">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Booking"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}