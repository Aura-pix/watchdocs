"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { installations } from "@/lib/db/schema";
import { requireAppUser } from "@/lib/app/session";
import {
  getAppUrl,
  isBillingConfigured,
  overagePriceId,
  planPriceId,
} from "./config";
import { getStripe } from "./stripe";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function billingError(message: string): never {
  redirect(`/app/billing?error=${encodeURIComponent(message)}`);
}

async function assertOwnedInstallation(userId: string, rawId: string) {
  if (!UUID_PATTERN.test(rawId)) {
    redirect("/app");
  }

  const db = getDb();
  const [installation] = await db
    .select()
    .from(installations)
    .where(
      and(eq(installations.id, rawId), eq(installations.userId, userId)),
    )
    .limit(1);

  if (!installation) {
    redirect("/app");
  }

  return installation;
}

export async function startCheckoutAction(formData: FormData): Promise<void> {
  const user = await requireAppUser();
  const plan = String(formData.get("plan") ?? "");
  const installation = await assertOwnedInstallation(
    user.id,
    String(formData.get("installationId") ?? ""),
  );

  if (!isBillingConfigured()) {
    billingError("Billing is not enabled yet.");
  }

  const price = planPriceId(plan);
  if (!price) {
    billingError(
      "That plan is not available through checkout. Contact us for Enterprise.",
    );
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    client_reference_id: installation.id,
    metadata: { type: "subscription", installationId: installation.id },
    subscription_data: { metadata: { installationId: installation.id } },
    success_url: `${getAppUrl()}/app/billing?billing=success`,
    cancel_url: `${getAppUrl()}/app/billing?billing=cancelled`,
  });

  if (!session.url) {
    billingError("Stripe did not return a checkout URL.");
  }

  redirect(session.url);
}

export async function startOverageCheckoutAction(
  formData: FormData,
): Promise<void> {
  const user = await requireAppUser();
  const installation = await assertOwnedInstallation(
    user.id,
    String(formData.get("installationId") ?? ""),
  );

  if (!isBillingConfigured()) {
    billingError("Billing is not enabled yet.");
  }

  const price = overagePriceId();
  if (!price) {
    billingError("Overage packs are not configured yet.");
  }

  const quantity = Math.max(
    1,
    Math.min(50, Number(formData.get("quantity") ?? 1) || 1),
  );
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price, quantity }],
    client_reference_id: installation.id,
    metadata: {
      type: "overage",
      installationId: installation.id,
      quantity: String(quantity),
    },
    success_url: `${getAppUrl()}/app/billing?billing=success`,
    cancel_url: `${getAppUrl()}/app/billing?billing=cancelled`,
  });

  if (!session.url) {
    billingError("Stripe did not return a checkout URL.");
  }

  redirect(session.url);
}

export async function openBillingPortalAction(
  formData: FormData,
): Promise<void> {
  const user = await requireAppUser();
  const installation = await assertOwnedInstallation(
    user.id,
    String(formData.get("installationId") ?? ""),
  );

  if (!isBillingConfigured()) {
    billingError("Billing is not enabled yet.");
  }

  if (!installation.stripeCustomerId) {
    billingError(
      "No Stripe customer exists for this installation yet. Start a subscription first.",
    );
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: installation.stripeCustomerId,
    return_url: `${getAppUrl()}/app/billing`,
  });

  redirect(session.url);
}

export async function cancelSubscriptionAction(
  formData: FormData,
): Promise<void> {
  const user = await requireAppUser();
  const installation = await assertOwnedInstallation(
    user.id,
    String(formData.get("installationId") ?? ""),
  );

  if (!isBillingConfigured()) {
    billingError("Billing is not enabled yet.");
  }

  const db = getDb();

  if (installation.stripeSubscriptionId) {
    const stripe = getStripe();
    await stripe.subscriptions.cancel(installation.stripeSubscriptionId);
  }

  await db
    .update(installations)
    .set({
      plan: "free",
      stripeSubscriptionId: null,
      stripeSubscriptionStatus: "canceled",
      stripePriceId: null,
    })
    .where(eq(installations.id, installation.id));

  redirect("/app/billing?billing=success");
}
