"use client";

import jsPDF from "jspdf";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase/client";
import { calculateFees, formatCurrency } from "@/lib/utils";

type BookingRecord = {
  id: string;
  provider_id: string;
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

type PublicBookingResponse = {
  provider?: {
    name: string | null;
  };
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

function SuccessPageContent() {
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
  const [copied, setCopied] = useState(false);
  const [providerName, setProviderName] = useState<string | null>(null);

  const loadBooking = useCallback(async () => {
    if (!reference) {
      throw new Error("Booking reference is missing");
    }

    const { data, error: bookingError } = await supabase
      .from("bookings")
      .select(
        "id, provider_id, reference, deposit_amount, client_email, confirmation_pin, service_date, status, paid_at",
      )
      .eq("reference", reference)
      .single();

    if (bookingError || !data) {
      throw new Error("Booking not found");
    }

    const nextBooking = data as BookingRecord;

    try {
      const providerRes = await fetch(`/api/public/bookings/${encodeURIComponent(reference)}`, {
        cache: "no-store",
      });

      if (providerRes.ok) {
        const providerData = (await providerRes.json()) as PublicBookingResponse;
        setProviderName(providerData.provider?.name ?? null);
      } else {
        setProviderName(null);
      }
    } catch {
      setProviderName(null);
    }

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

  async function handleCopyPin() {
    if (!booking?.confirmation_pin) {
      return;
    }

    try {
      await navigator.clipboard.writeText(booking.confirmation_pin);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err: unknown) {
      console.error("Copy PIN error:", err);
      setError("Failed to copy PIN");
    }
  }

  function downloadReceipt() {
    if (!booking) {
      return;
    }

    const fees = calculateFees(booking.deposit_amount);
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("HoldPay Payment Receipt", 20, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Receipt Date: ${new Date().toLocaleDateString()}`, 20, 35);
    doc.text(`Booking Reference: ${booking.reference}`, 20, 42);
    doc.text(`Provider: ${providerName || "N/A"}`, 20, 49);

    doc.line(20, 55, 190, 55);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Payment Breakdown", 20, 65);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Deposit Amount:", 20, 75);
    doc.text(formatCurrency(fees.depositAmount), 150, 75);

    doc.text(`Stripe Processing Fee (${fees.stripePercentage}% + $0.30):`, 20, 82);
    doc.text(`-${formatCurrency(fees.stripeFee)}`, 150, 82);

    doc.text(`HoldPay Service Fee (${fees.holdpayPercentage}%):`, 20, 89);
    doc.text(`-${formatCurrency(fees.holdpayFee)}`, 150, 89);

    doc.line(20, 95, 190, 95);

    doc.setFont("helvetica", "bold");
    doc.text("Net to Provider:", 20, 105);
    doc.text(formatCurrency(fees.netToProvider), 150, 105);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Payment settles per agreed terms. Fees deducted before transfer.", 20, 120);
    doc.text("For questions, contact: support@holdpay.com", 20, 127);

    doc.setFontSize(8);
    doc.text("HoldPay • Simply the tool for booking deposits", 105, 280, {
      align: "center",
    });

    doc.save(`HoldPay-Receipt-${booking.reference}.pdf`);
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

  const fees = calculateFees(booking.deposit_amount);
  const isCancelled = booking.status === "cancelled_client_early";
  const isDepositSecured = booking.status === "deposit_secured";
  const cancelWindowActive = isDepositSecured && timeLeft > 0;

  if (isCancelled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mb-4 text-5xl">✓</div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900">Booking Cancelled</h1>
          <p className="text-slate-600">
            Your full refund has been initiated back to your original payment method.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-slate-800">
      <nav className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-[60px] w-full max-w-[480px] items-center justify-between px-5">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="font-medium text-slate-800"
          >
            ← Back
          </button>
          <div className="text-[22px] font-bold tracking-[-0.5px]">
            <span className="text-slate-800">Hold</span>
            <span className="text-sky-500">Pay</span>
          </div>
        </div>
      </nav>

      <div className="mx-auto w-full max-w-[480px] px-6 py-6">
        <div className="mb-10 text-center">
          <h1 className="mb-1 text-[28px] font-bold">Booking Confirmed</h1>
          <p className="text-slate-500">Your deposit is now protected in escrow</p>
        </div>

        {error ? (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {!isDepositSecured ? (
          <div className="mb-5 rounded-2xl border border-yellow-200 bg-yellow-50 px-5 py-4 text-sm text-yellow-800 shadow-sm">
            We&apos;re still finalizing your payment confirmation. Your escrow protection and
            refund window will appear here as soon as payment is fully confirmed.
          </div>
        ) : null}

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <h2 className="mb-4 text-lg font-semibold">Booking Confirmation</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Reference</strong>
              <br />
              {booking.reference}
            </div>
            <div>
              <strong>Deposit Held</strong>
              <br />
              <span className="font-semibold">{formatCurrency(booking.deposit_amount)}</span>
            </div>
            <div>
              <strong>Confirmation Email</strong>
              <br />
              {booking.client_email || "Not provided"}
            </div>
            <div>
              <strong>Service Date</strong>
              <br />
              {booking.service_date
                ? new Date(booking.service_date).toLocaleDateString()
                : "Not provided"}
            </div>
            <div>
              <strong>Payment Confirmed</strong>
              <br />
              {formatDateTime(booking.paid_at)}
            </div>
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <h3 className="mb-3 font-semibold">Your 6-Digit PIN</h3>
          <div className="relative my-5 rounded-2xl bg-slate-100 p-6">
            <div className="text-center text-[42px] font-bold tracking-[12px] text-slate-800">
              {booking.confirmation_pin}
            </div>
            <button
              type="button"
              onClick={handleCopyPin}
              className="absolute right-5 top-5 text-slate-500 transition hover:text-sky-500"
              aria-label="Copy PIN"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect
                  x="9"
                  y="9"
                  width="13"
                  height="13"
                  rx="2"
                  ry="2"
                  stroke="currentColor"
                  strokeWidth="2.5"
                />
                <path
                  d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div
              className={`pointer-events-none absolute right-5 top-[-36px] rounded-md bg-slate-800 px-2.5 py-1 text-xs text-white transition-opacity ${
                copied ? "opacity-100" : "opacity-0"
              }`}
            >
              Copied!
            </div>
          </div>
          <p className="mt-3 text-center text-[13px] text-slate-500">
            Keep this safe. The PIN has also been emailed to your address.
            <br />
            Share it with the provider only when you are ready.
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-6">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Payment Breakdown</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Deposit Amount</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(fees.depositAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">
                Stripe Processing Fee ({fees.stripePercentage}% + $0.30)
              </span>
              <span className="text-red-600">-{formatCurrency(fees.stripeFee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">
                HoldPay Service Fee ({fees.holdpayPercentage}%)
              </span>
              <span className="text-red-600">-{formatCurrency(fees.holdpayFee)}</span>
            </div>
            <div className="my-3 h-px bg-gray-300" />
            <div className="flex justify-between">
              <span className="font-semibold text-gray-900">Net to Provider</span>
              <span className="text-lg font-bold text-green-700">
                {formatCurrency(fees.netToProvider)}
              </span>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Payments settle per agreed terms. Fees deducted before transfer.
          </p>

          <button
            onClick={downloadReceipt}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-gray-700 transition-colors hover:bg-gray-50"
          >
            <span>📄</span>
            <span>Download Receipt</span>
          </button>
        </div>

        <div
          className={`mb-5 rounded-2xl border p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${
            cancelWindowActive
              ? "border-yellow-500 bg-yellow-50 text-yellow-900"
              : isDepositSecured
                ? "border-slate-400 bg-slate-100 text-slate-500"
                : "border-yellow-200 bg-yellow-50 text-yellow-800"
          }`}
        >
          <h3 className="mb-2 font-semibold">
            {cancelWindowActive
              ? "60-Second Full Refund Window"
              : isDepositSecured
                ? "Refund Window Expired"
                : "Refund Window Pending"}
          </h3>

          {cancelWindowActive ? (
            <div className="mb-4 flex items-center justify-center gap-2 text-lg font-semibold text-sky-500">
              <span className="text-[28px]">{timeLeft}</span>
              <span>seconds left</span>
            </div>
          ) : null}

          <p className="text-sm leading-6">
            {cancelWindowActive
              ? "If you need to cancel, you can still do so now for a full refund. After this window closes, your funds will remain locked in escrow and be subject to the provider’s cancellation policy."
              : isDepositSecured
                ? "Your deposit is now locked in escrow and you’ll be bound by the provider’s cancellation policy."
                : "Your quick-cancel option will appear here once payment finalization is complete."}
          </p>

          <button
            onClick={handleQuickCancel}
            disabled={!cancelWindowActive || loading}
            className="mt-4 w-full rounded-xl bg-red-500 px-4 py-3.5 font-semibold text-white disabled:opacity-50"
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

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <h3 className="mb-4 font-semibold">How HoldPay protects you</h3>
          <ul className="space-y-3 text-sm leading-6">
            <li>✓ Your deposit stays locked in escrow until the PIN is provided.</li>
            <li>✓ The provider only receives funds when you choose to share the PIN.</li>
            <li>✓ You control when (or if) the PIN is released.</li>
            <li>✓ If anything goes wrong, you can raise a dispute at any time.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function SuccessPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-700">
      Loading your booking confirmation...
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<SuccessPageFallback />}>
      <SuccessPageContent />
    </Suspense>
  );
}