import { describe, expect, it } from "vitest";
import { detectContractChange, routePathFromFile } from "../detect";

function diff(body: string, file = "src/routes/swap.ts"): string {
  return [
    `diff --git a/${file} b/${file}`,
    "index 1111111..2222222 100644",
    `--- a/${file}`,
    `+++ b/${file}`,
    "@@ -1,6 +1,6 @@",
    body,
  ].join("\n");
}

describe("detectContractChange", () => {
  it("detects a route path change", () => {
    const result = detectContractChange(
      diff("-router.post('/v1/swap', handler)\n+router.post('/v2/swap', handler)"),
    );

    expect(result.changed).toBe(true);
    expect(result.endpoint.method).toBe("POST");
    expect(result.endpoint.path).toBe("/v2/swap");
    expect(result.signals.some((signal) => signal.kind === "route")).toBe(true);
  });

  it("detects an HTTP method change", () => {
    const result = detectContractChange(
      diff("-router.get('/swap', handler)\n+router.post('/swap', handler)"),
    );

    expect(result.changed).toBe(true);
    expect(result.endpoint.method).toBe("POST");
  });

  it("ignores internal-only changes", () => {
    const result = detectContractChange(
      diff(
        [
          "-  const tmp = await computeSwap();",
          "+  const swap = await computeSwap();",
          "-  console.log('swap complete');",
          "+  console.log('swap done');",
        ].join("\n"),
      ),
    );

    expect(result.changed).toBe(false);
    expect(result.reason).toContain("internal-only");
  });

  it("detects a new request field", () => {
    const result = detectContractChange(
      diff(
        [
          "   const schema = z.object({",
          "     amount: z.string(),",
          "+    slippageBps: z.number().max(500),",
          "   });",
        ].join("\n"),
      ),
    );

    expect(result.changed).toBe(true);
    expect(
      result.signals.some(
        (signal) => signal.kind === "request" || signal.kind === "schema",
      ),
    ).toBe(true);
  });

  it("detects a new error status", () => {
    const result = detectContractChange(
      diff(
        [
          "   if (rateLimitExceeded) {",
          '+    throw new ApiError(429, "RATE_LIMITED");',
          "   }",
        ].join("\n"),
      ),
    );

    expect(result.changed).toBe(true);
    expect(result.signals.some((signal) => signal.kind === "error")).toBe(true);
  });

  it("treats logging a status code as internal", () => {
    const result = detectContractChange(
      diff('+  console.log("rate limited with 429");'),
    );

    expect(result.changed).toBe(false);
  });

  it("detects exported route handlers in app router files", () => {
    const result = detectContractChange(
      diff(
        "+export async function POST(request: Request) {",
        "app/api/swap/route.ts",
      ),
    );

    expect(result.changed).toBe(true);
    expect(result.endpoint.method).toBe("POST");
  });
});

describe("routePathFromFile", () => {
  it("maps app router files to route paths", () => {
    expect(routePathFromFile("app/api/swap/route.ts")).toBe("/api/swap");
    expect(routePathFromFile("app/api/v1/[id]/route.ts")).toBe("/api/v1/:id");
    expect(routePathFromFile("app/(marketing)/about/route.ts")).toBe("/about");
  });

  it("maps pages api files", () => {
    expect(routePathFromFile("pages/api/swap.ts")).toBe("/api/swap");
    expect(routePathFromFile("pages/api/users/index.ts")).toBe("/api/users");
  });

  it("returns null for non-route files", () => {
    expect(routePathFromFile("src/routes/swap.ts")).toBeNull();
  });
});
