import "server-only";

import Stripe from "stripe";

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2026-02-25.clover";

let stripeServer: Stripe | null = null;

export function getStripeServer() {
  stripeServer ??= new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
  });

  return stripeServer;
}