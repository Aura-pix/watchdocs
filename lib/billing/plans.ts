export type PlanId = "free" | "pro" | "team" | "enterprise";

export interface PlanDef {
  id: PlanId;
  name: string;
  priceLabel: string;
  repoLimit: number | null;
  updateLimit: number | null;
  features: string[];
}

export const PLANS: Record<PlanId, PlanDef> = {
  free: {
    id: "free",
    name: "Free",
    priceLabel: "$0",
    repoLimit: 1,
    updateLimit: 30,
    features: ["1 repository", "30 doc updates per month", "Diff filtering"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceLabel: "$19/mo",
    repoLimit: 5,
    updateLimit: 200,
    features: [
      "5 repositories",
      "200 doc updates per month",
      "llms.txt and OpenAPI sync",
      "Failure documentation",
      "Overage packs available",
    ],
  },
  team: {
    id: "team",
    name: "Team",
    priceLabel: "$49/mo",
    repoLimit: 20,
    updateLimit: 1000,
    features: [
      "20 repositories",
      "1,000 doc updates per month",
      "Custom prompt templates",
      "Priority support",
      "Overage packs available",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    priceLabel: "Custom",
    repoLimit: null,
    updateLimit: null,
    features: [
      "Unlimited repositories",
      "Unlimited doc updates",
      "SSO and bring-your-own LLM key",
      "Audit log and SLA",
      "Security review",
    ],
  },
};

export const OVERAGE_UPDATES_PER_PACK = 250;

export interface PlanLimits {
  repoLimit: number | null;
  updateLimit: number | null;
}

export function getPlanLimits(
  plan: string,
  overagePacks = 0,
): PlanLimits {
  const def = PLANS[plan as PlanId] ?? PLANS.free;

  return {
    repoLimit: def.repoLimit,
    updateLimit:
      def.updateLimit === null
        ? null
        : def.updateLimit + overagePacks * OVERAGE_UPDATES_PER_PACK,
  };
}

export function isPaidPlan(plan: string): boolean {
  return plan === "pro" || plan === "team";
}
