"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";

type BookingRecord = {
  id: string;
  provider_id: string;
  reference: string;
  deposit_amount: number;
  client_email: string | null;
  service_date: string | null;
  refund_policy: "none" | "25" | "50" | "custom";
  custom_refund_percentage: number | null;
  status: string;
  created_at: string;
  paid_at?: string | null;
  completed_at?: string | null;
};

type ProviderRecord = {
  id: string;
  name?: string | null;
  user_id: string;
};

function getStatusClasses(status: string) {
  if (status === "completed") return "bg-green-100 text-green-800";
  if (status === "deposit_secured") return "bg-blue-100 text-blue-800";
  if (status === "awaiting_payment") return "bg-yellow-100 text-yellow-800";
  if (status.includes("cancelled")) return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-800";
}

function getRefundPolicyLabel(booking: BookingRecord) {
  if (booking.refund_policy === "none") return "Non-refundable";
  if (booking.refund_policy === "25") return "25% refund on cancellation";
  if (booking.refund_policy === "50") return "50% refund on cancellation";
  if (booking.refund_policy === "custom") {
    return `${booking.custom_refund_percentage ?? 0}% refund on cancellation`;
  }

  return "Not specified";
}

function formatDate(value: string | null | undefined, includeTime = false) {
  if (!value) {
    return "Not specified";
  }

  const date = new Date(value);

  return includeTime ? date.toLocaleString() : date.toLocaleDateString();
}

export default function BookingReferencePage() {
  const params = useParams();
  const router = useRouter();

  const reference = useMemo(() => {
    const param = params.reference;
    return Array.isArray(param) ? param[0] : param;
  }, [params.reference]);

  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [provider, setProvider] = useState<ProviderRecord | null>(null);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBooking = useCallback(async () => {
    if (!reference) {
      router.push("/dashboard");
      return;
    }

    setPageLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/sign-in");
        return;
      }

      const { data: providerData, error: providerError } = await supabase
        .from("providers")
        .select("id, name, user_id")
        .eq("user_id", user.id)
        .single();

      if (providerError || !providerData) {
        router.push("/dashboard");
        return;
      }

      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select("*")
        .eq("reference", reference)
        .single();

      if (bookingError || !bookingData) {
        router.push("/dashboard");
        return;
      }

      if (bookingData.provider_id !== providerData.id) {
        router.push("/dashboard");
        return;
      }

      setProvider(providerData as ProviderRecord);
      setBooking(bookingData as BookingRecord);
    } catch (err: unknown) {
      console.error("Load booking error:", err);
      setError(err instanceof Error ? err.message : "Failed to load booking");
    } finally {
      setPageLoading(false);
    }
  }, [reference, router]);

  useEffect(() => {
    void loadBooking();
  }, [loadBooking]);

  const paymentLink = useMemo(() => {
    if (!booking) {
      return "";
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    return `${appUrl}/pay/${booking.reference}`;
  }, [booking]);

  async function handlePinConfirm() {
    if (!booking || pin.length !== 6) {
      setError("Please enter a valid 6-digit PIN");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/bookings/${booking.id}/confirm-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data: { error?: string } = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to confirm service");
      }

      window.alert("✓ Service confirmed! Funds released to your account.");
      setPin("");
      await loadBooking();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid PIN");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!booking) {
      return;
    }

    const confirmMessage =
      booking.status === "deposit_secured"
        ? "Cancel this booking? The client will receive a FULL REFUND."
        : "Delete this booking request?";

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelled_by: "provider" }),
      });

      const data: { error?: string } = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel booking");
      }

      window.alert("Booking cancelled");
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to cancel booking");
      setLoading(false);
    }
  }

  async function copyPaymentLink() {
    if (!paymentLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(paymentLink);
      window.alert("Payment link copied to clipboard!");
    } catch (err: unknown) {
      console.error("Copy payment link error:", err);
      setError("Failed to copy payment link");
    }
  }

  if (pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-700">
        Loading...
      </div>
    );
  }

  if (!booking || !provider) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-700">
        Booking not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-800">
            ← Back to Dashboard
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            Booking {booking.reference}
          </h1>
        </div>

        {error ? (
          <div className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Booking Details</h2>

          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <span
                  className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusClasses(
                    booking.status,
                  )}`}
                >
                  {booking.status.replace(/_/g, " ").toUpperCase()}
                </span>
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Deposit Amount</dt>
              <dd className="mt-1 text-sm font-semibold text-gray-900">
                {formatCurrency(booking.deposit_amount)}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Client Email</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {booking.client_email || "Not paid yet"}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Service Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(booking.service_date)}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Refund Policy</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {getRefundPolicyLabel(booking)}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(booking.created_at, true)}
              </dd>
            </div>

            {booking.paid_at ? (
              <div>
                <dt className="text-sm font-medium text-gray-500">Paid At</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(booking.paid_at, true)}
                </dd>
              </div>
            ) : null}

            {booking.completed_at ? (
              <div>
                <dt className="text-sm font-medium text-gray-500">Completed At</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(booking.completed_at, true)}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        {booking.status === "awaiting_payment" ? (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-6">
            <h3 className="mb-2 text-lg font-semibold text-blue-900">Payment Link</h3>
            <p className="mb-4 text-sm text-blue-700">
              Send this link to your client to collect the deposit
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={paymentLink}
                className="flex-1 rounded-md border border-blue-300 bg-white px-3 py-2 text-sm"
              />
              <button
                onClick={copyPaymentLink}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Copy Link
              </button>
            </div>
          </div>
        ) : null}

        {booking.status === "deposit_secured" ? (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-6">
            <h3 className="mb-2 text-lg font-semibold text-green-900">
              Confirm Service Completion
            </h3>
            <p className="mb-4 text-sm text-green-700">
              After completing the service, ask your client for their 6-digit confirmation PIN
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 6-digit PIN"
                className="w-48 rounded-md border border-green-300 px-3 py-2 text-center text-lg tracking-widest"
              />
              <button
                onClick={handlePinConfirm}
                disabled={loading || pin.length !== 6}
                className="rounded-md bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "Confirming..." : "Confirm & Release Funds"}
              </button>
            </div>
          </div>
        ) : null}

        {booking.status === "completed" ? (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-6">
            <h3 className="mb-2 text-lg font-semibold text-green-900">✓ Service Completed</h3>
            <p className="text-sm text-green-700">Funds have been released to your account</p>
          </div>
        ) : null}

        {booking.status === "awaiting_payment" || booking.status === "deposit_secured" ? (
          <div className="flex justify-end">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {booking.status === "deposit_secured"
                ? "Cancel Booking (Issue Refund)"
                : "Delete Booking"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}