# Watchdocs

Watchdocs is a GitHub App that opens a pull request when your API changes and your docs are out of date. It reads the code diff, finds the documentation that mentions the changed endpoint, edits only the affected sections, and asks a human to review.

Nothing merges on its own.

## Status

The landing page and waitlist run on Postgres, and the documentation engine is split into testable modules with a CLI dry-run. The GitHub App, webhook queue, dashboard, and billing are the next milestones. See `WATCHDOCS_BUILD_SPEC.md` for the full product shape and `TODO.md` for the engine roadmap.

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4
- Neon Postgres + Drizzle ORM
- Gemini via the Generative Language API
- Resend for waitlist email
- Vitest for unit tests

## Getting started

```bash
npm install
cp .env.example .env.local
```

Create a Neon Postgres database, put the connection string in `DATABASE_URL`, then push the schema:

```bash
npm run db:push
```

Start the app:

```bash
npm run dev
```

Open http://localhost:3000.

Without `DATABASE_URL`, the waitlist route writes to `waitlist.json` in development. In production it returns 503 instead of silently dropping signups.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Production | Neon Postgres connection string |
| `GEMINI_API_KEY` | Engine | Gemini API key |
| `WATCHDOCS_LLM_MODEL` | No | Model id, defaults to `gemini-2.5-flash` |
| `RESEND_API_KEY` | No | Sends waitlist confirmation email |
| `WAITLIST_FROM_EMAIL` | No | Verified Resend sender |
| `NEXT_PUBLIC_GITHUB_APP_INSTALL_URL` | Later | GitHub App install URL used by the hero button |

## Documentation engine

The engine lives in `lib/engine` and runs in two places: the CLI (`scripts/watchdocs-engine.ts`) and, later, the GitHub App pipeline. The CLI stays as a local dry-run tool.

Pipeline:

1. **Filter** (`run.ts`, `glob.ts`) — match changed files against `.watchdocsrc.json`, apply ignore globs.
2. **Semantic gate** (`detect.ts`) — inspect the diff for route paths, HTTP methods, request schemas, and 4xx/5xx error changes. Internal refactors exit at zero cost.
3. **Doc discovery** (`discover.ts`) — rank the docs that mention the endpoint or error codes. `llms.txt` and OpenAPI files are always included.
4. **Ground truth** (`fixtures.ts`) — pull request, response, and failure payloads from sibling test files.
5. **Surgical editing** (`patch.ts`, `frontmatter.ts`, `llm.ts`) — the model returns replacements. Frontmatter is stripped before the call, restored after, and every edit is validated for missing headings, truncation, and unbalanced fences.
6. **Pull request** (`pr.ts`, `git.ts`) — branch `watchdocs/sync-<short-sha>`, rich PR body, labels, and the original commit author assigned as reviewer. An open Watchdocs PR is reused instead of opening a new one.

Run it locally against the current commit:

```bash
npm run engine:dry
```

Or run the real flow, which writes files, pushes a branch, and opens a PR with the GitHub CLI:

```bash
npm run engine
```

### Configuration

`.watchdocsrc.json` defines watched route globs, ignored paths, documentation files, and PR settings. If `docs.files` is empty, the engine scans `docs.paths` instead.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript without emit |
| `npm test` | Unit tests |
| `npm run db:push` | Apply the Drizzle schema to Postgres |
| `npm run db:generate` | Generate SQL migrations |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run engine:dry` | Run the docs engine without writing or pushing |
| `npm run engine` | Run the docs engine and open a PR |

## Layout

```
app/                landing page, layout, waitlist route
components/         InstallButton, InteractiveDiff, WaitlistForm
lib/db/             Drizzle schema and Neon client
lib/engine/         filtering, detection, discovery, fixtures, patching, LLM, PR
scripts/            CLI entry point
.github/workflows/  CI and the self-hosted sync action
```
