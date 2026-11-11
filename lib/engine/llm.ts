import type {
  DocCandidate,
  DocEdit,
  EndpointSignature,
  Fixture,
  LLMResult,
  Replacement,
} from "./types";

interface Price {
  input: number;
  output: number;
}

const DEFAULT_MODEL = "gemini-2.5-flash";

const PRICES: Record<string, Price> = {
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-2.5-pro": { input: 1.25, output: 10 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
  "gemini-1.5-flash": { input: 0.075, output: 0.3 },
};

const MAX_DIFF_CHARS = 48_000;
const MAX_DOC_CHARS = 24_000;

function truncate(value: string, limit: number): string {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit)}\n... [truncated ${value.length - limit} characters]`;
}

export function getModel(): string {
  return process.env.WATCHDOCS_LLM_MODEL ?? DEFAULT_MODEL;
}

function getPrice(model: string): Price {
  const fromEnvInput = process.env.WATCHDOCS_PRICE_INPUT_PER_M;
  const fromEnvOutput = process.env.WATCHDOCS_PRICE_OUTPUT_PER_M;
  if (fromEnvInput || fromEnvOutput) {
    return {
      input: Number(fromEnvInput ?? PRICES[model]?.input ?? 0),
      output: Number(fromEnvOutput ?? PRICES[model]?.output ?? 0),
    };
  }
  return PRICES[model] ?? { input: 0, output: 0 };
}

export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const price = getPrice(model);
  const cost =
    (inputTokens / 1_000_000) * price.input +
    (outputTokens / 1_000_000) * price.output;
  return Number(cost.toFixed(6));
}

const SYSTEM_INSTRUCTION = `You are Watchdocs, an automated technical documentation engine.
You update Markdown documentation from a real code diff. You are precise, conservative, and never invent API behavior.

RULES:
1. Only edit sections affected by the route, schema, or error changes in the diff.
2. Keep the existing voice, headings, and formatting. Do not rewrite unrelated prose.
3. Document every new or changed request parameter, response field, and 4xx/5xx error status.
4. Use the provided test fixtures as ground truth for payload shapes and status codes.
5. YAML frontmatter has already been removed from the documents you receive. Do not add it back.
6. Prefer surgical replacements over rewriting a whole file.

Return strict JSON in this shape:
{
  "edits": [
    {
      "path": "docs/quickstart.md",
      "replacements": [
        { "find": "exact existing text, unique in the file", "replace": "updated text" }
      ]
    }
  ]
}

If a document needs no change, omit it. Never return a path that was not provided.`;

export interface LlmInput {
  commitMessage: string;
  diff: string;
  docs: DocCandidate[];
  fixtures: Fixture[];
  endpoint: EndpointSignature;
  apiKey?: string;
  model?: string;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}

function parseJsonResponse(raw: string): unknown {
  const trimmed = raw.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(withoutFence.slice(start, end + 1));
    }
    throw new Error("Model did not return valid JSON.");
  }
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

function normalizeEdits(data: unknown, allowed: Set<string>): DocEdit[] {
  if (!data || typeof data !== "object") {
    throw new Error("Model response must be a JSON object.");
  }

  const record = data as Record<string, unknown>;

  if (record.files && typeof record.files === "object") {
    const files = record.files as Record<string, unknown>;
    return Object.entries(files).map(([file, content]) => {
      const path = normalizePath(file);
      if (!allowed.has(path)) {
        throw new Error(`Model returned an unknown document path: ${path}`);
      }
      if (typeof content !== "string") {
        throw new Error(`Model returned non-string content for ${path}.`);
      }
      return { path, content };
    });
  }

  if (!Array.isArray(record.edits)) {
    throw new Error("Model response is missing an edits array.");
  }

  return record.edits.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("Each edit must be an object.");
    }

    const edit = item as Record<string, unknown>;
    const path = normalizePath(String(edit.path ?? ""));
    if (!allowed.has(path)) {
      throw new Error(`Model returned an unknown document path: ${path}`);
    }

    if (typeof edit.content === "string") {
      return { path, content: edit.content };
    }

    if (Array.isArray(edit.replacements)) {
      const replacements: Replacement[] = edit.replacements.map((entry) => {
        const replacement = entry as Record<string, unknown>;
        if (
          typeof replacement.find !== "string" ||
          typeof replacement.replace !== "string"
        ) {
          throw new Error(`Invalid replacement for ${path}.`);
        }
        return { find: replacement.find, replace: replacement.replace };
      });
      return { path, replacements };
    }

    throw new Error(`Edit for ${path} has no content or replacements.`);
  });
}

export async function generateDocEdits(input: LlmInput): Promise<LLMResult> {
  const apiKey = input.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local or the workflow environment.",
    );
  }

  const model = input.model ?? getModel();
  const allowed = new Set(input.docs.map((doc) => doc.path));

  const docsBlock = input.docs
    .map(
      (doc) =>
        `===== FILE: ${doc.path} =====\n${truncate(doc.content, MAX_DOC_CHARS)}`,
    )
    .join("\n\n");

  const fixturesBlock =
    input.fixtures.length > 0
      ? input.fixtures
          .map(
            (fixture) =>
              `--- ${fixture.file} (${fixture.kind}) ---\n${fixture.snippet}`,
          )
          .join("\n\n")
      : "No test fixtures were found. Do not invent payload values that are absent from the diff.";

  const userPrompt = `COMMIT MESSAGE:
${input.commitMessage}

ENDPOINT:
${[input.endpoint.method, input.endpoint.path, input.endpoint.handler]
  .filter(Boolean)
  .join(" ") || "unknown"}

GIT DIFF:
${truncate(input.diff, MAX_DIFF_CHARS)}

GROUND TRUTH TEST FIXTURES:
${fixturesBlock}

CURRENT DOCUMENTS (frontmatter removed):
${docsBlock}`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(endpoint, {
    method: "POST",
    signal: AbortSignal.timeout(90_000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error: ${response.status} - ${errorText}`);
  }

  const json = (await response.json()) as GeminiResponse;
  const rawText = json.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("");

  if (!rawText) {
    throw new Error("LLM API returned no content.");
  }

  const edits = normalizeEdits(parseJsonResponse(rawText), allowed);
  const inputTokens = json.usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = json.usageMetadata?.candidatesTokenCount ?? 0;

  return {
    edits,
    usage: {
      model,
      inputTokens,
      outputTokens,
      costUsd: estimateCost(model, inputTokens, outputTokens),
    },
  };
}
