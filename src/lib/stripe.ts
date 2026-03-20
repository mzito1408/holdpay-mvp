"use client";

import { loadStripe } from "@stripe/stripe-js";
import type { Stripe as StripeJs } from "@stripe/stripe-js";

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

let stripeJsPromise: Promise<StripeJs | null> | null = null;

export function getStripeJs() {
  const publishableKey = requireEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");

  console.log("Stripe key check:", {
    hasKey: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    keyStart: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 10),
  });

  stripeJsPromise ??= loadStripe(publishableKey);

  return stripeJsPromise;
}

export function formatAmountForStripe(amount: number) {
  return Math.round(amount * 100);
}