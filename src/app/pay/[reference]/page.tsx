"use client";

import type {
  Stripe,
  StripeElements,
  StripePaymentElement,
} from "@stripe/stripe-js";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@/lib/supabase/client";
import { getStripeJs } from "@/lib/stripe";
import { formatCurrency } from "@/lib/utils";

type RefundPolicy = "none" | "25" | "50" | "custom";

type BookingRecord = {
  id: string;
  provider_id: string;
  reference: string;
  deposit_amount: number;
  service_date: string | null;
  refund_policy: RefundPolicy;
  custom_refund_percentage: number | null;
  client_email: string | null;
  status: string;
};

type ProviderRecord = {
  id: string;
  name: string | null;
};

type CreatePaymentIntentResponse = {
  clientSecret?: string;
  error?: string;
};

function getRefundPolicyText(booking: BookingRecord) {
  if (booking.refund_policy === "none") {
    return "This deposit is non-refundable if you cancel.";
  }

  if (booking.refund_policy === "25") {
    return "You will receive a 25% refund if you cancel before the service.";
  }

  if (booking.refund_policy === "50") {
    return "You will receive a 50% refund if you cancel before the service.";
  }

  return `You will receive a ${booking.custom_refund_percentage ?? 0}% refund if you cancel before the service.`;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function PaymentPage() {
  const params = useParams();

  const reference = useMemo(() => {
    const param = params.reference;
    return Array.isArray(param) ? param[0] : param;
  }, [params.reference]);

  const paymentElementContainerRef = useRef<HTMLDivElement | null>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const paymentElementRef = useRef<StripePaymentElement | null>(null);

  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [provider, setProvider] = useState<ProviderRecord | null>(null);
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentFormReady, setPaymentFormReady] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const mountPaymentElement = useCallback(async (nextClientSecret: string) => {
    const stripe = await getStripeJs();

    if (!stripe) {
      throw new Error("Stripe failed to load");
    }

    if (!paymentElementContainerRef.current) {
      throw new Error("Payment form is not ready yet");
    }

    paymentElementRef.current?.unmount();

    const elements = stripe.elements({
      clientSecret: nextClientSecret,
      appearance: {
        theme: "stripe",
      },
      loader: "auto",
    });

    const paymentElement = elements.create("payment", {
      layout: "tabs",
    });

    paymentElement.on("change", (event) => {
      if (!event.empty) {
        setError("");
      }
    });

    paymentElement.on("loaderror", (event) => {
      setError(event.error.message || "Failed to load payment form");
      setPaymentFormReady(false);
    });

    paymentElement.mount(paymentElementContainerRef.current);

    stripeRef.current = stripe;
    elementsRef.current = elements;
    paymentElementRef.current = paymentElement;
    setPaymentFormReady(true);
  }, []);

  const loadBooking = useCallback(async () => {
    if (!reference) {
      setError("Booking not found");
      setPageLoading(false);
      return;
    }

    setPageLoading(true);
    setError("");

    try {
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select("*")
        .eq("reference", reference)
        .single();

      if (bookingError || !bookingData) {
        throw new Error("Booking not found");
      }

      if (bookingData.status !== "awaiting_payment") {
        throw new Error("This booking has already been paid or cancelled");
      }

      const { data: providerData, error: providerError } = await supabase
        .from("providers")
        .select("id, name")
        .eq("id", bookingData.provider_id)
        .single();

      if (providerError || !providerData) {
        throw new Error("Provider not found");
      }

      const typedBooking = bookingData as BookingRecord;

      setBooking(typedBooking);
      setProvider(providerData as ProviderRecord);
      setEmail(typedBooking.client_email ?? "");
    } catch (err: unknown) {
      console.error("Load payment page error:", err);
      setError(err instanceof Error ? err.message : "Failed to load booking");
    } finally {
      setPageLoading(false);
    }
  }, [reference]);

  useEffect(() => {
    void loadBooking();
  }, [loadBooking]);

  useEffect(() => {
    if (!clientSecret) {
      return;
    }

    setPaymentFormReady(false);

    void mountPaymentElement(clientSecret).catch((err: unknown) => {
      console.error("Mount payment element error:", err);
      setError(err instanceof Error ? err.message : "Failed to load payment form");
      setPaymentFormReady(false);
    });
  }, [clientSecret, mountPaymentElement]);

  useEffect(() => {
    return () => {
      paymentElementRef.current?.unmount();
      paymentElementRef.current = null;
      elementsRef.current = null;
      stripeRef.current = null;
    };
  }, []);

  async function initializePaymentElement() {
    if (!booking) {
      throw new Error("Booking not found");
    }

    const trimmedEmail = email.trim();

    if (!isValidEmail(trimmedEmail)) {
      throw new Error("Please enter a valid email address");
    }

    if (!agreed) {
      throw new Error("You must agree to the cancellation policy to proceed");
    }

    const res = await fetch("/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_id: booking.id,
        email: trimmedEmail,
      }),
    });

    const data = (await res.json()) as CreatePaymentIntentResponse;

    if (!res.ok || !data.clientSecret) {
      throw new Error(data.error || "Failed to initialize payment");
    }

    setPaymentFormReady(false);
    setClientSecret(data.clientSecret);
  }

  async function handlePayment() {
    const trimmedEmail = email.trim();

    if (!isValidEmail(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!agreed) {
      setError("You must agree to the cancellation policy to proceed");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (!clientSecret) {
        await initializePaymentElement();
        return;
      }

      if (!booking || !stripeRef.current || !elementsRef.current || !paymentFormReady) {
        throw new Error("Payment form is not ready yet");
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

      const { error: stripeError } = await stripeRef.current.confirmPayment({
        elements: elementsRef.current,
        confirmParams: {
          return_url: `${appUrl}/success/${booking.reference}`,
          payment_method_data: {
            billing_details: {
              email: trimmedEmail,
            },
          },
        },
      });

      if (stripeError) {
        throw new Error(stripeError.message || "Payment failed");
      }
    } catch (err: unknown) {
      console.error("Payment error:", err);
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  if (pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-700">
        Loading...
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-md rounded-lg bg-white p-6 shadow">
          <h2 className="mb-2 text-xl font-bold text-red-600">Error</h2>
          <p className="text-gray-700">{error}</p>
        </div>
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
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Pay Deposit</h1>
          <p className="mt-2 text-gray-600">
            Secure your booking with {provider.name || "your provider"}
          </p>
        </div>

        {error ? (
          <div className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Booking Summary</h2>

          <dl className="space-y-3">
            <div className="flex justify-between gap-4">
              <dt className="text-sm text-gray-600">Booking Reference</dt>
              <dd className="text-sm font-medium text-gray-900">{booking.reference}</dd>
            </div>

            <div className="flex justify-between gap-4">
              <dt className="text-sm text-gray-600">Provider</dt>
              <dd className="text-sm font-medium text-gray-900">
                {provider.name || "Not specified"}
              </dd>
            </div>

            <div className="flex justify-between gap-4">
              <dt className="text-sm text-gray-600">Deposit Amount</dt>
              <dd className="text-xl font-bold text-gray-900">
                {formatCurrency(booking.deposit_amount)}
              </dd>
            </div>

            {booking.service_date ? (
              <div className="flex justify-between gap-4">
                <dt className="text-sm text-gray-600">Service Date</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {new Date(booking.service_date).toLocaleDateString()}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-6">
          <h3 className="mb-2 text-lg font-semibold text-yellow-900">Cancellation Policy</h3>
          <p className="text-sm text-yellow-800">{getRefundPolicyText(booking)}</p>
          <p className="mt-2 text-sm text-yellow-800">
            ✓ You have 60 seconds after payment to cancel for a full refund
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Payment Details</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                Your Email Address *
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                disabled={Boolean(clientSecret)}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="you@example.com"
              />
              <p className="mt-1 text-xs text-gray-500">
                We&apos;ll use this for your payment confirmation details.
              </p>
            </div>

            <div className="flex items-start">
              <input
                id="agree"
                type="checkbox"
                checked={agreed}
                disabled={loading}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="agree" className="ml-2 block text-sm text-gray-700">
                I understand and agree to the provider&apos;s cancellation policy stated above
              </label>
            </div>

            {clientSecret ? (
              <div className="rounded-lg border border-gray-200 p-4">
                {!paymentFormReady ? (
                  <p className="mb-3 text-sm text-gray-500">Loading secure payment form...</p>
                ) : null}
                <div ref={paymentElementContainerRef} />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                Enter your email and agree to the policy, then continue to load Stripe&apos;s
                secure payment form.
              </div>
            )}

            <button
              onClick={handlePayment}
              disabled={loading || !email.trim() || !agreed || (Boolean(clientSecret) && !paymentFormReady)}
              className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? clientSecret
                  ? "Processing..."
                  : "Loading secure payment form..."
                : clientSecret && !paymentFormReady
                  ? "Loading secure payment form..."
                : clientSecret
                  ? `Pay ${formatCurrency(booking.deposit_amount)}`
                  : "Continue to secure payment"}
            </button>

            <p className="text-center text-xs text-gray-500">
              Your payment is secured by Stripe. Your deposit is held in escrow until
              service completion.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}