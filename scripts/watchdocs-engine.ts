import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

// 1. Helper to run shell commands safely
function run(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf-8" }).trim();
  } catch (err: unknown) {
    const stderr = err instanceof Error && "stderr" in err ? err.stderr : undefined;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Command failed: ${cmd}\n`, stderr || message);
    throw err;
  }
}

async function main() {
  console.log("🔍 [Watchdocs] Inspecting commit diff...");

  // Load Config
  const configPath = path.join(process.cwd(), ".watchdocsrc.json");
  if (!fs.existsSync(configPath)) {
    console.error("❌ No .watchdocsrc.json found in repo root.");
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

  // The first commit has no parent, so compare it against Git's empty tree.
  const commitParents = run("git rev-list --parents -n 1 HEAD").split(/\s+/);
  const parentCommit = commitParents[1];
  const changedFilesCommand = parentCommit
    ? `git diff --name-only ${parentCommit} HEAD`
    : "git diff-tree --root --no-commit-id --name-only -r HEAD";
  const changedFiles = run(changedFilesCommand)
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);

  console.log("Changed files in push:", changedFiles);

  // Filter against watched routes/schemas
  const watchedRoutes = changedFiles.filter((file) => {
    const isIgnore = config.watch.ignore?.some((pat: string) =>
      file.includes(pat.replace(/\*/g, "")),
    );
    if (isIgnore) return false;
    return (
      file.startsWith("src/routes/") ||
      file.startsWith("src/controllers/") ||
      file.includes("openapi")
    );
  });

  if (watchedRoutes.length === 0) {
    console.log("✅ No API routes or schemas modified. Exiting.");
    process.exit(0);
  }

  console.log(`⚡ API changes detected in: ${watchedRoutes.join(", ")}`);

  // Extract raw git diff of the route files
  const apiDiff = parentCommit
    ? run(`git diff ${parentCommit} HEAD -- ${watchedRoutes.join(" ")}`)
    : run(`git diff-tree --root --no-commit-id -p HEAD -- ${watchedRoutes.join(" ")}`);
  const commitMessage = run("git log -1 --pretty=%B");
  const shortSha = run("git rev-parse --short HEAD");

  // Read current doc files specified in config
  const docContents: Record<string, string> = {};
  for (const docFile of config.docs.files) {
    if (fs.existsSync(docFile)) {
      docContents[docFile] = fs.readFileSync(docFile, "utf-8");
    }
  }

  console.log("🤖 Querying LLM to update documentation...");

  // Call LLM (OpenAI API example using structured output / prompt)
  const updatedDocs = await callLLMDocUpdater({
    commitMessage,
    apiDiff,
    currentDocs: docContents,
  });

  // Check if any changes were actually recommended
  let hasChanges = false;
  for (const [file, newContent] of Object.entries(updatedDocs)) {
    if (docContents[file] !== newContent) {
      fs.writeFileSync(file, newContent as string);
      console.log(`📝 Updated ${file}`);
      hasChanges = true;
    }
  }

  if (!hasChanges) {
    console.log(
      "ℹ️ LLM determined existing docs are already accurate. No PR needed.",
    );
    process.exit(0);
  }

  // 4. Git Operations: Branch, Commit, Push & PR
  const branchName = `${config.pr.branchPrefix || "watchdocs/update-"}${shortSha}`;

  console.log(`🌿 Creating branch: ${branchName}`);
  run("git config user.name 'watchdocs-bot[bot]'");
  run("git config user.email 'watchdocs-bot[bot]@users.noreply.github.com'");
  run(`git checkout -b ${branchName}`);
  run("git add " + Object.keys(updatedDocs).join(" "));
  run(`git commit -m "docs: auto-sync for API changes in ${shortSha}"`);
  run(`git push origin ${branchName} --force`);

  // Open PR using GitHub CLI (gh) installed on all GitHub Action runners
  const prBody = `
## 📖 Watchdocs Automated PR

### Why this PR was opened:
Commit \`${shortSha}\` modified API routes or schemas:
\`\`\`
${watchedRoutes.join("\n")}
\`\`\`

### Summary of Docs Updates:
- Updated parameter signatures and error codes.
- Synced \`llms.txt\` and guides to reflect current behavior.

> ⚠️ **No auto-merge**: Please review the diff below, verify examples, and merge when ready.
  `.trim();

  console.log("🚀 Submitting Pull Request...");
  run(
    `gh pr create --title "docs: update specs & guides for ${shortSha}" --body "${prBody}" --head ${branchName} --base main`,
  );
  console.log("🎉 PR successfully opened!");
}

// ----------------------------------------------------------------------
// LLM Prompt Orchestration
// ----------------------------------------------------------------------
async function callLLMDocUpdater({
  commitMessage,
  apiDiff,
  currentDocs,
}: {
  commitMessage: string;
  apiDiff: string;
  currentDocs: Record<string, string>;
}): Promise<Record<string, string>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }

  const systemInstruction = `
You are Watchdocs, an automated technical documentation engine.
Your mission is to update Markdown documentation and llms.txt based on a code diff.

CRITICAL RULES:
1. ONLY edit sections directly affected by the route changes or parameter changes.
2. DO NOT rewrite stylistic choices, headings, or tone.
3. If new error codes or 4xx/5xx failures are added in the code diff, explicitly document them in errors.md or equivalent.
4. Keep llms.txt dense, token-efficient, and strictly focused on API contract facts.
5. Return a strict JSON object mapping filename to full updated markdown content:
{
  "docs/quickstart.md": "...updated markdown...",
  "public/llms.txt": "...updated content..."
}
`;

  const userPrompt = `
COMMIT MESSAGE:
${commitMessage}

GIT CODE DIFF:
${apiDiff}

CURRENT DOCS:
${JSON.stringify(currentDocs, null, 2)}
`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const json = await response.json();
  const rawText = json.candidates[0].content.parts[0].text;
  return JSON.parse(rawText);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
