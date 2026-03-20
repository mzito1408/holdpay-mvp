"use client";

import { loadStripe } from "@stripe/stripe-js";
import type { Stripe as StripeJs } from "@stripe/stripe-js";

let stripeJsPromise: Promise<StripeJs | null> | null = null;

export function getStripeJs() {
  if (stripeJsPromise) {
    return stripeJsPromise;
  }

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!publishableKey) {
    console.error("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
    return Promise.resolve(null);
  }

  console.log("Stripe initialized with key:", `${publishableKey.substring(0, 10)}...`);

  stripeJsPromise = loadStripe(publishableKey);
  return stripeJsPromise;
}

export function formatAmountForStripe(amount: number) {
  return Math.round(amount * 100);
}