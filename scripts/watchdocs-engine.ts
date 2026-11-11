import fs from "node:fs";
import path from "node:path";
import { runWatchdocs } from "../lib/engine/run";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  try {
    process.loadEnvFile(envPath);
  } catch {
    console.warn("[watchdocs] Could not load .env.local");
  }
}

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const asJson = args.has("--json");

async function main() {
  const result = await runWatchdocs({ dryRun });

  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`[watchdocs] status: ${result.status}`);
  console.log(`[watchdocs] ${result.reason}`);

  if (result.commit) {
    console.log(
      `[watchdocs] commit ${result.commit.shortSha} by ${result.commit.authorName}`,
    );
  }

  if (result.changedFiles.length > 0) {
    console.log(`[watchdocs] changed source files: ${result.changedFiles.join(", ")}`);
  }

  for (const change of result.docChanges) {
    console.log(`[watchdocs] updated ${change.path}`);
  }

  if (result.usage.model) {
    console.log(
      `[watchdocs] tokens in=${result.usage.inputTokens} out=${result.usage.outputTokens} cost=$${result.usage.costUsd}`,
    );
  }

  if (result.prUrl) {
    console.log(`[watchdocs] pull request: ${result.prUrl}`);
  }
}

main().catch((error: unknown) => {
  console.error("[watchdocs] failed:", error);
  process.exitCode = 1;
});
