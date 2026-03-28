"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { formatCurrency } from "@/lib/utils";

type BookingRecord = {
  id: string;
  provider_id: string;
  reference: string;
  deposit_amount: number;
  client_email: string | null;
  confirmation_pin?: string | null;
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

type BookingReferenceResponse = {
  booking?: BookingRecord;
  provider?: ProviderRecord;
  error?: string;
};

function getStatusClasses(status: string) {
  if (status === "completed") return "bg-emerald-100 text-emerald-700";
  if (status === "deposit_secured") return "bg-sky-100 text-sky-700";
  if (status === "awaiting_payment") return "bg-amber-100 text-amber-700";
  if (status.includes("cancelled")) return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-700";
}

function getStatusSubtitle(status: string) {
  if (status === "completed") return "Service completed • Funds released";
  if (status === "deposit_secured") return "Deposit secured • Awaiting PIN confirmation";
  if (status === "awaiting_payment") return "Waiting for client payment";
  if (status.includes("cancelled")) return "Booking cancelled";
  return status.replace(/_/g, " ");
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
    setError("");

    try {
      const res = await fetch(`/api/bookings/reference/${encodeURIComponent(reference)}`, {
        cache: "no-store",
      });

      const data = (await res.json()) as BookingReferenceResponse;

      if (res.status === 401) {
        router.push("/sign-in");
        return;
      }

      if (res.status === 403 || res.status === 404) {
        router.push("/dashboard");
        return;
      }

      if (!res.ok || !data.booking || !data.provider) {
        throw new Error(data.error || "Failed to load booking");
      }

      setProvider(data.provider);
      setBooking(data.booking);
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-700">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          Booking not found.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-slate-800">
      <nav className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-[60px] w-full max-w-[480px] items-center justify-between px-5">
          <Link href="/dashboard" className="font-medium text-slate-800">
            ← Back to Dashboard
          </Link>
          <div className="text-[22px] font-bold tracking-[-0.5px]">
            <span className="text-slate-800">Hold</span>
            <span className="text-sky-500">Pay</span>
          </div>
        </div>
      </nav>

      <div className="mx-auto w-full max-w-[480px] px-6 py-6">
        <div className="mb-8">
          <h1 className="mb-1 text-[26px] font-bold text-slate-900">Booking {booking.reference}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span>{getStatusSubtitle(booking.status)}</span>
            <span className="text-slate-300">•</span>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusClasses(
                booking.status,
              )}`}
            >
              {booking.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        {error ? (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {booking.status === "completed" ? (
          <div className="mb-5 rounded-3xl border border-[#E5E7EB] bg-white p-6">
            <div className="mb-6 text-center">
              <p className="text-sm text-gray-500">Total released to your account</p>
              <p className="text-4xl font-semibold text-emerald-600">$94.70</p>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Client deposit</span>
                <span className="font-medium">$100.00</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Payment processor fee (Stripe)</span>
                <span className="font-medium text-red-600">–$3.20</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">HoldPay fee (2.1%)</span>
                <span className="font-medium text-red-600">–$2.10</span>
              </div>

              <div className="my-2 h-px bg-gray-200"></div>

              <div className="flex justify-between font-semibold">
                <span className="text-gray-900">Net amount received</span>
                <span className="text-emerald-600">$94.70</span>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-gray-500">
              Released to your connected payout account
            </p>
          </div>
        ) : (
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <p className="text-[15px] text-slate-500">
              {booking.status === "deposit_secured"
                ? "Deposit currently held in escrow"
                : "Deposit requested from client"}
            </p>
            <div className="mt-2 text-[32px] font-bold text-sky-500">
              {formatCurrency(booking.deposit_amount)}
            </div>

            <div className="mt-5 space-y-0 text-[15px]">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-left text-slate-600">Client deposit</span>
                <span className="text-right font-semibold text-slate-900">
                  {formatCurrency(booking.deposit_amount)}
                </span>
              </div>

              {booking.paid_at ? (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-left text-slate-600">Payment confirmed</span>
                  <span className="text-right text-slate-900">{formatDate(booking.paid_at, true)}</span>
                </div>
              ) : null}

              {booking.completed_at ? (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-left text-slate-600">Funds released</span>
                  <span className="text-right text-slate-900">
                    {formatDate(booking.completed_at, true)}
                  </span>
                </div>
              ) : null}

              <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-3 font-bold text-sky-500">
                <span className="text-left">Deposit amount</span>
                <span className="text-right">{formatCurrency(booking.deposit_amount)}</span>
              </div>
            </div>

            <p className="mt-4 text-[13px] text-slate-500">
              {booking.status === "deposit_secured"
                ? "Funds will release instantly after valid PIN confirmation"
                : "Share the payment link below to collect the deposit"}
            </p>
          </div>
        )}

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Booking Details</h2>

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-semibold text-slate-900">Client Email</dt>
              <dd className="mt-1 text-slate-600">{booking.client_email || "Not paid yet"}</dd>
            </div>

            <div>
              <dt className="font-semibold text-slate-900">Service Date</dt>
              <dd className="mt-1 text-slate-600">{formatDate(booking.service_date)}</dd>
            </div>

            <div>
              <dt className="font-semibold text-slate-900">Refund Policy</dt>
              <dd className="mt-1 text-slate-600">{getRefundPolicyLabel(booking)}</dd>
            </div>

            <div>
              <dt className="font-semibold text-slate-900">Created</dt>
              <dd className="mt-1 text-slate-600">{formatDate(booking.created_at, true)}</dd>
            </div>
          </dl>
        </div>

        {booking.status === "awaiting_payment" ? (
          <div className="mb-5 rounded-2xl border border-sky-200 bg-sky-50 p-6 shadow-sm">
            <h3 className="mb-2 text-lg font-semibold text-sky-900">Payment Link</h3>
            <p className="mb-4 text-sm text-sky-700">
              Send this link to your client to collect the deposit
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={paymentLink}
                className="flex-1 rounded-xl border border-sky-200 bg-white px-3 py-3 text-sm"
              />
              <button
                onClick={copyPaymentLink}
                className="rounded-xl bg-sky-500 px-4 py-3 text-sm font-medium text-white hover:bg-sky-600"
              >
                Copy Link
              </button>
            </div>
          </div>
        ) : null}

        {booking.status === "deposit_secured" ? (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
            <h3 className="mb-2 text-lg font-semibold text-emerald-900">
              Confirm Service Completion
            </h3>
            <p className="mb-4 text-sm text-emerald-700">
              After completing the service, ask your client for their 6-digit confirmation PIN
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 6-digit PIN"
                className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-3 text-center text-lg tracking-[0.35em] text-slate-900 sm:w-48"
              />
              <button
                onClick={handlePinConfirm}
                disabled={loading || pin.length !== 6}
                className="rounded-xl bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? "Confirming..." : "Confirm & Release Funds"}
              </button>
            </div>
          </div>
        ) : null}

        {booking.status === "completed" ? (
          <>
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <p className="text-sm text-emerald-800">
                You verified the client&apos;s PIN. Funds released instantly.
              </p>
            </div>

            <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <p className="mb-2 text-[15px] text-slate-500">Client&apos;s confirmation PIN</p>
              <div className="my-4 rounded-xl bg-slate-100 px-4 py-5 text-center text-[36px] font-bold tracking-[14px] text-slate-900">
                {booking.confirmation_pin || "Not available"}
              </div>
              <p className="text-center text-[13px] text-slate-500">
                Client provided this PIN to release the funds
              </p>
            </div>
          </>
        ) : null}

        {booking.status === "awaiting_payment" || booking.status === "deposit_secured" ? (
          <div className="flex justify-end">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="w-full rounded-xl bg-red-500 px-4 py-3 font-medium text-white hover:bg-red-600 disabled:opacity-50"
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