import { describe, expect, it } from "vitest";
import {
  getPlanLimits,
  isPaidPlan,
  OVERAGE_UPDATES_PER_PACK,
  PLANS,
} from "../plans";

describe("billing plans", () => {
  it("defines the four public plans", () => {
    expect(PLANS.free.repoLimit).toBe(1);
    expect(PLANS.pro.repoLimit).toBe(5);
    expect(PLANS.team.repoLimit).toBe(20);
    expect(PLANS.enterprise.repoLimit).toBeNull();
    expect(PLANS.enterprise.updateLimit).toBeNull();
  });

  it("returns base limits for a plan", () => {
    expect(getPlanLimits("free")).toEqual({ repoLimit: 1, updateLimit: 30 });
    expect(getPlanLimits("pro")).toEqual({ repoLimit: 5, updateLimit: 200 });
    expect(getPlanLimits("team")).toEqual({
      repoLimit: 20,
      updateLimit: 1000,
    });
  });

  it("adds 250 updates per overage pack", () => {
    expect(getPlanLimits("pro", 2).updateLimit).toBe(
      200 + 2 * OVERAGE_UPDATES_PER_PACK,
    );
    expect(getPlanLimits("team", 1).updateLimit).toBe(1250);
  });

  it("falls back to the free plan for unknown plans", () => {
    expect(getPlanLimits("unknown")).toEqual({ repoLimit: 1, updateLimit: 30 });
  });

  it("keeps unlimited plans unlimited", () => {
    expect(getPlanLimits("enterprise", 5)).toEqual({
      repoLimit: null,
      updateLimit: null,
    });
  });

  it("identifies paid plans", () => {
    expect(isPaidPlan("pro")).toBe(true);
    expect(isPaidPlan("team")).toBe(true);
    expect(isPaidPlan("free")).toBe(false);
    expect(isPaidPlan("enterprise")).toBe(false);
  });
});
