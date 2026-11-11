import { describe, expect, it } from "vitest";
import { extractFixtures } from "../fixtures";

describe("extractFixtures", () => {
  it("extracts request payloads from supertest-style tests", () => {
    const content = `
      it("swaps tokens", async () => {
        const res = await request(app)
          .post("/swap")
          .send({ tokenIn: "0xUSDC", tokenOut: "0xWETH", amount: "1000000" });
        expect(res.body).toEqual({ ok: true });
      });
    `;

    const fixtures = extractFixtures("src/routes/swap.test.ts", content);

    expect(fixtures.some((fixture) => fixture.kind === "request")).toBe(true);
    expect(fixtures.some((fixture) => fixture.kind === "response")).toBe(true);
  });

  it("extracts expected error statuses", () => {
    const content = `
      it("rate limits", async () => {
        const res = await request(app).post("/swap").send({});
        expect(res.status).toBe(429);
      });
    `;

    const fixtures = extractFixtures("src/routes/swap.test.ts", content);

    expect(fixtures.some((fixture) => fixture.kind === "error")).toBe(true);
  });

  it("returns an empty list for tests without payloads", () => {
    expect(extractFixtures("x.test.ts", "it('works', () => {})")).toEqual([]);
  });
});
