export function isBillingConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.NEXT_PUBLIC_APP_URL,
  );
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function planPriceId(plan: string): string | null {
  switch (plan) {
    case "pro":
      return process.env.STRIPE_PRICE_PRO ?? null;
    case "team":
      return process.env.STRIPE_PRICE_TEAM ?? null;
    default:
      return null;
  }
}

export function overagePriceId(): string | null {
  return process.env.STRIPE_PRICE_OVERAGE ?? null;
}
