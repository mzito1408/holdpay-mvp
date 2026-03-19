import { loadStripe } from "@stripe/stripe-js";
import type { Stripe as StripeJs } from "@stripe/stripe-js";
import Stripe from "stripe";

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

const STRIPE_API_VERSION = "2024-11-20.acacia" as unknown as Stripe.LatestApiVersion;

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: STRIPE_API_VERSION,
  typescript: true,
});

let stripeJsPromise: Promise<StripeJs | null> | null = null;

export function getStripeServer() {
  return stripe;
}

export function getStripeJs() {
  stripeJsPromise ??= loadStripe(requireEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"));

  return stripeJsPromise;
}

export function formatAmountForStripe(amount: number) {
  return Math.round(amount * 100);
}