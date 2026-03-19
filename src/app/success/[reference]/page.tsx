"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";

type BookingRecord = {
  id: string;
  reference: string;
  deposit_amount: number;
  client_email: string | null;
  confirmation_pin: string;
  service_date: string | null;
  status: string;
  paid_at: string | null;
};

type FinalizePaymentResponse = {
  booking?: BookingRecord;
  error?: string;
};

function getTimeLeftSeconds(paidAt: string | null) {
  if (!paidAt) {
    return 0;
  }

  const paidTime = new Date(paidAt).getTime();

  if (Number.isNaN(paidTime)) {
    return 0;
  }

  return Math.max(0, 60 - Math.floor((Date.now() - paidTime) / 1000));
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not provided";
  }

  return new Date(value).toLocaleString();
}

export default function SuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const reference = useMemo(() => {
    const value = params.reference;
    return Array.isArray(value) ? value[0] : value;
  }, [params.reference]);

  const paymentIntentId = searchParams.get("payment_intent");

  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadBooking = useCallback(async () => {
    if (!reference) {
      throw new Error("Booking reference is missing");
    }

    const { data, error: bookingError } = await supabase
      .from("bookings")
      .select(
        "id, reference, deposit_amount, client_email, confirmation_pin, service_date, status, paid_at",
      )
      .eq("reference", reference)
      .single();

    if (bookingError || !data) {
      throw new Error("Booking not found");
    }

    const nextBooking = data as BookingRecord;

    setBooking(nextBooking);
    setTimeLeft(
      nextBooking.status === "deposit_secured" ? getTimeLeftSeconds(nextBooking.paid_at) : 0,
    );

    return nextBooking;
  }, [reference]);

  const finalizePayment = useCallback(async () => {
    if (!reference) {
      return null;
    }

    const res = await fetch("/api/bookings/finalize-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference,
        payment_intent_id: paymentIntentId ?? undefined,
      }),
    });

    const data = (await res.json()) as FinalizePaymentResponse;

    if (!res.ok) {
      throw new Error(data.error || "Failed to finalize payment");
    }

    return data.booking ?? null;
  }, [paymentIntentId, reference]);

  useEffect(() => {
    async function hydratePage() {
      setPageLoading(true);
      setError("");

      try {
        await finalizePayment();
        await loadBooking();
      } catch (err: unknown) {
        console.error("Load success page error:", err);
        setError(err instanceof Error ? err.message : "Failed to load booking details");
      } finally {
        setPageLoading(false);
      }
    }

    void hydratePage();
  }, [finalizePayment, loadBooking]);

  useEffect(() => {
    if (!booking?.paid_at || booking.status !== "deposit_secured") {
      return;
    }

    const interval = window.setInterval(() => {
      setTimeLeft(getTimeLeftSeconds(booking.paid_at));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [booking?.paid_at, booking?.status]);

  async function handleQuickCancel() {
    if (!booking) {
      return;
    }

    const confirmed = window.confirm(
      "Cancel this booking? You will receive a full refund immediately.",
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cancelled_by: "client_early",
          payment_intent_id: paymentIntentId ?? undefined,
        }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel booking");
      }

      await loadBooking();
      setBooking((current) =>
        current
          ? {
              ...current,
              status: "cancelled_client_early",
            }
          : current,
      );
      setTimeLeft(0);
      window.alert("✓ Booking cancelled. Full refund processed.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to cancel booking");
    } finally {
      setLoading(false);
    }
  }

  if (pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-700">
        Loading your booking confirmation...
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-md rounded-lg bg-white p-6 shadow">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Booking not found</h1>
          <p className="text-gray-600">{error || "We could not load your booking details."}</p>
        </div>
      </div>
    );
  }

  const isCancelled = booking.status === "cancelled_client_early";
  const isDepositSecured = booking.status === "deposit_secured";
  const cancelWindowActive = isDepositSecured && timeLeft > 0;

  if (isCancelled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow">
          <div className="mb-4 text-5xl">✓</div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Booking Cancelled</h1>
          <p className="text-gray-600">
            Your full refund has been initiated back to your original payment method.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <div className="mb-4 text-6xl">✓</div>
          <h1 className="text-3xl font-bold text-gray-900">Booking Confirmed</h1>
          <p className="mt-2 text-gray-600">
            Your deposit is protected by HoldPay escrow until service completion.
          </p>
        </div>

        {error ? (
          <div className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {!isDepositSecured ? (
          <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            We&apos;re still finalizing your payment confirmation. Your escrow protection and refund
            window will appear here as soon as the payment is fully confirmed.
          </div>
        ) : null}

        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Booking Confirmation</h2>
          <dl className="space-y-3 text-sm text-gray-700">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Reference</dt>
              <dd className="font-medium text-gray-900">{booking.reference}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Deposit Held</dt>
              <dd className="font-medium text-gray-900">
                {formatCurrency(booking.deposit_amount)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Confirmation Email</dt>
              <dd className="font-medium text-gray-900">
                {booking.client_email || "Not provided"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Service Date</dt>
              <dd className="font-medium text-gray-900">
                {booking.service_date
                  ? new Date(booking.service_date).toLocaleDateString()
                  : "Not provided"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Payment Confirmed</dt>
              <dd className="font-medium text-gray-900">{formatDateTime(booking.paid_at)}</dd>
            </div>
          </dl>
        </div>

        <div className="mb-6 rounded-lg border-2 border-blue-200 bg-blue-50 p-8 text-center">
          <h2 className="mb-2 text-xl font-semibold text-blue-900">Your 6-Digit PIN</h2>
          <p className="mb-6 text-sm text-blue-700">
            Keep this safe and only share it with the provider after the service is fully complete.
          </p>
          <div className="mb-4 rounded-lg bg-white p-6 shadow-sm">
            <div className="text-5xl font-bold tracking-[0.4em] text-gray-900 sm:text-6xl">
              {booking.confirmation_pin}
            </div>
          </div>
          <p className="text-xs text-blue-700">
            The provider cannot release the escrowed funds without this PIN.
          </p>
        </div>

        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h3 className="mb-3 font-semibold text-gray-900">How your escrow protection works</h3>
          <ul className="space-y-3 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="mr-2 text-green-500">✓</span>
              <span>Your deposit stays locked in escrow after payment.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-green-500">✓</span>
              <span>The provider only gets paid after you share your PIN.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-green-500">✓</span>
              <span>Only share the PIN once the service is complete and you are satisfied.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-green-500">✓</span>
              <span>If the service does not happen, the provider cannot claim the escrowed funds.</span>
            </li>
          </ul>
        </div>

        <div
          className={`rounded-lg border p-6 ${
            cancelWindowActive
              ? "border-yellow-200 bg-yellow-50"
              : "border-green-200 bg-green-50"
          }`}
        >
          <h3
            className={`mb-2 font-semibold ${
              cancelWindowActive ? "text-yellow-900" : "text-green-900"
            }`}
          >
            {cancelWindowActive ? "60-Second Full Refund Window" : "Deposit Locked in Escrow"}
          </h3>
          <p
            className={`mb-4 text-sm ${
              cancelWindowActive ? "text-yellow-800" : "text-green-800"
            }`}
          >
            {cancelWindowActive
              ? `You can still cancel for a full refund for the next ${timeLeft} seconds.`
              : isDepositSecured
                ? "Your quick-cancel window has expired. Your deposit remains protected in escrow until service completion."
                : "Your quick-cancel button will activate once payment finalization completes."}
          </p>

          <button
            onClick={handleQuickCancel}
            disabled={!cancelWindowActive || loading}
            className="w-full rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Cancelling..."
              : cancelWindowActive
                ? "Cancel Booking (Full Refund)"
                : isDepositSecured
                  ? "Refund Window Expired"
                  : "Finalizing Payment..."}
          </button>
        </div>
      </div>
    </div>
  );
}