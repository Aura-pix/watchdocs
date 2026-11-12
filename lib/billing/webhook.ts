import { eq, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { getDb } from "@/lib/db";
import { installations } from "@/lib/db/schema";
import { getStripe } from "./stripe";

function planFromPriceId(priceId: string | null): string {
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_TEAM) return "team";
  return "free";
}

export async function handleStripeWebhook(
  body: string,
  signature: string,
): Promise<Stripe.Event> {
  const stripe = getStripe();
  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET as string,
  );

  const db = getDb();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const installationId = session.client_reference_id;

      if (!installationId) break;

      if (session.metadata?.type === "overage") {
        const quantity = Number(session.metadata.quantity ?? 1) || 1;
        await db
          .update(installations)
          .set({
            overagePacks: sql`${installations.overagePacks} + ${quantity}`,
          })
          .where(eq(installations.id, installationId));
        break;
      }

      await db
        .update(installations)
        .set({
          stripeCustomerId: session.customer
            ? String(session.customer)
            : undefined,
          stripeSubscriptionId: session.subscription
            ? String(session.subscription)
            : undefined,
          stripeSubscriptionStatus: "active",
        })
        .where(eq(installations.id, installationId));
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const priceId = subscription.items.data[0]?.price.id ?? null;

      await db
        .update(installations)
        .set({
          stripeSubscriptionId: subscription.id,
          stripeSubscriptionStatus: subscription.status,
          stripePriceId: priceId,
          plan: planFromPriceId(priceId),
        })
        .where(eq(installations.stripeSubscriptionId, subscription.id));
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;

      await db
        .update(installations)
        .set({
          plan: "free",
          stripeSubscriptionId: null,
          stripeSubscriptionStatus: "canceled",
          stripePriceId: null,
        })
        .where(eq(installations.stripeSubscriptionId, subscription.id));
      break;
    }

    default:
      break;
  }

  return event;
}
