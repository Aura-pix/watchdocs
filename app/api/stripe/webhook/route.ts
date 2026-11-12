import { NextResponse } from "next/server";
import { isBillingConfigured } from "@/lib/billing/config";
import { handleStripeWebhook } from "@/lib/billing/webhook";
import { isDbConfigured } from "@/lib/db";

export async function POST(request: Request) {
  if (!isBillingConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 503 },
    );
  }

  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  try {
    await handleStripeWebhook(body, signature);
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Stripe webhook failed:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
