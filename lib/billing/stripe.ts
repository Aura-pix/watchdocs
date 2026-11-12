import Stripe from "stripe";
import { isBillingConfigured } from "./config";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!isBillingConfigured()) {
    throw new Error("Stripe is not configured.");
  }

  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  }

  return client;
}
