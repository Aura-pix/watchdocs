import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { detectContractChange } from "@/lib/engine/detect";
import {
  buildUnifiedDiff,
  isBotSender,
  isDefaultBranchPush,
  isWatchdocsBranch,
  verifyGitHubSignature,
} from "../webhook";

function sign(body: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

describe("GitHub webhook helpers", () => {
  it("verifies a valid sha256 signature", () => {
    const body = '{"ok":true}';
    expect(verifyGitHubSignature(body, sign(body, "s3cret"), "s3cret")).toBe(
      true,
    );
  });

  it("rejects missing, malformed, and wrong signatures", () => {
    const body = '{"ok":true}';
    expect(verifyGitHubSignature(body, null, "s3cret")).toBe(false);
    expect(verifyGitHubSignature(body, "sha1=abc", "s3cret")).toBe(false);
    expect(verifyGitHubSignature(body, sign(body, "other"), "s3cret")).toBe(
      false,
    );
  });

  it("detects bots and Watchdocs branches", () => {
    expect(isBotSender({ id: 1, login: "dependabot[bot]" })).toBe(true);
    expect(isBotSender({ id: 1, login: "watchdocs", type: "Bot" })).toBe(true);
    expect(isBotSender({ id: 1, login: "octocat", type: "User" })).toBe(false);
    expect(isWatchdocsBranch("refs/heads/watchdocs/sync-abc1234")).toBe(true);
    expect(isWatchdocsBranch("refs/heads/main")).toBe(false);
  });

  it("only accepts pushes to the connected default branch", () => {
    expect(isDefaultBranchPush("refs/heads/main", "main")).toBe(true);
    expect(isDefaultBranchPush("refs/heads/feature", "main")).toBe(false);
  });

  it("rebuilds a diff the contract detector can read", () => {
    const diff = buildUnifiedDiff([
      {
        filename: "src/routes/swap.ts",
        status: "modified",
        patch:
          '@@ -10,6 +10,8 @@\n-  return handler;\n+  router.post("/v2/swap", handler);\n+  throw new ApiError(429, "rate limited");',
      },
      {
        filename: "src/assets/logo.png",
        status: "modified",
      },
    ]);

    const result = detectContractChange(diff);
    expect(result.changed).toBe(true);
    expect(result.endpoint.path).toBe("/v2/swap");
    expect(result.endpoint.method).toBe("POST");
    expect(result.signals.some((signal) => signal.detail === "status 429")).toBe(
      true,
    );
  });
});
