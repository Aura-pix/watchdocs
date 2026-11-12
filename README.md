# Watchdocs

Watchdocs is a GitHub App that opens a pull request when your API changes and your docs are out of date. It reads the code diff, finds the documentation that mentions the changed endpoint, edits only the affected sections, and asks a human to review.

Nothing merges on its own.

## Status

The landing page and waitlist run on Postgres, the documentation engine is split into testable modules with a CLI dry-run, and the GitHub App install flow stores installations and repositories. The webhook queue, server-side push pipeline, repository settings, and run history are wired. Billing is a beta placeholder. Remaining milestones are public documentation polish, Stripe billing, and hardening. See `WATCHDOCS_BUILD_SPEC.md` for the full product shape and `TODO.md` for the engine roadmap.

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4
- Neon Postgres + Drizzle ORM
- Auth.js with GitHub, Octokit for the GitHub App
- Inngest for the webhook queue
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
| `AUTH_SECRET` | App | Auth.js session secret |
| `AUTH_GITHUB_ID` | App | GitHub App client id (OAuth credentials) |
| `AUTH_GITHUB_SECRET` | App | GitHub App client secret |
| `GITHUB_APP_ID` | App | Numeric GitHub App id |
| `GITHUB_APP_PRIVATE_KEY` | App | App private key PEM, newlines escaped as `\n` |
| `GITHUB_APP_PRIVATE_KEY_BASE64` | App | Base64 PEM (preferred for hosting) |
| `GITHUB_APP_SLUG` | App | App slug, used to build the install URL |
| `GITHUB_APP_INSTALL_URL` | No | Overrides the install URL |
| `NEXT_PUBLIC_GITHUB_APP_INSTALL_URL` | No | Public install URL used by the landing page |
| `GITHUB_WEBHOOK_SECRET` | App | HMAC secret for `/api/github/webhook` |
| `INNGEST_EVENT_KEY` | Production | Inngest event key |
| `INNGEST_SIGNING_KEY` | Production | Inngest signing key |

## GitHub App

Register the App first. These are the settings the code expects:

- Homepage: `http://localhost:3000` locally, your domain in production
- Callback URL: `http://localhost:3000/api/auth/callback/github`
- Setup URL: `http://localhost:3000/app/install/callback`
- Webhook URL: `http://localhost:3000/api/github/webhook`
- Permissions: Contents read/write, Pull requests read/write, Metadata read
- Events: `push`, `pull_request`, `installation`, `installation_repositories`

Then:

1. Copy the App id, client id, and client secret into `.env.local`.
2. Generate a private key and base64-encode it.
3. Set `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY_BASE64`, and `GITHUB_APP_SLUG`.
4. Generate `AUTH_SECRET` with `npx auth secret` or `openssl rand -base64 32`.
5. Set a webhook secret and put the same value in `GITHUB_WEBHOOK_SECRET`.
6. Run `npm run db:push`.

Base64-encode the key:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("key.pem"))
```

```bash
base64 -w0 key.pem
```

Flow: `/login` signs in with GitHub, the install button opens the App installation screen, GitHub redirects to `/app/install/callback`, the server verifies the signed-in user can manage that installation, lists its repositories, stores them, and sends you to `/app`. Connected repositories start paused and can be enabled from the dashboard.

## Webhook queue

`POST /api/github/webhook` verifies the `X-Hub-Signature-256` HMAC, stores the delivery id for dedupe, then enqueues an Inngest event. Push events are ignored when the sender is a bot, the branch is `watchdocs/*`, or the push is not to the connected default branch.

Run Inngest locally next to the app:

```bash
npm run dev:inngest
npm run dev
```

GitHub needs a public URL reachable from the internet for webhooks. In development, use a tunnel and point the App webhook URL at it. In production, configure the Inngest app with `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`; the handler is `/api/inngest`.

The queued push job:

1. Loads the repository tree through the GitHub App token.
2. Compares the pushed commits, filters watched API files, and runs the semantic gate.
3. Ranks docs, reads test fixtures, and asks the LLM for surgical edits.
4. Validates frontmatter, headings, fences, and grounded 4xx/5xx status codes.
5. Commits the edited docs and opens or updates a `watchdocs/sync-*` pull request.
6. Stores the run result, token usage, cost, and monthly usage.

`/app` shows connected repositories, open pull requests, and recent runs. `/app/runs` lists run history and `/app/runs/[id]` shows the endpoint, changed files, documentation before/after, the unified diff, tokens, cost, and errors. `/app/repos/[id]` edits watched paths, documentation paths, default branch, branch prefix, PR labels, and endpoint-to-doc mappings. `/app/settings` shows installations and deletes account data; `/app/billing` is a beta placeholder.

## Documentation engine

The engine lives in `lib/engine` and runs in two places: the CLI (`scripts/watchdocs-engine.ts`) and the GitHub App pipeline. The CLI stays as a local dry-run tool.

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
| `npm run dev:inngest` | Start the local Inngest dev server |
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
app/                landing, login, dashboard, runs, repo settings, waitlist/auth/webhook/Inngest routes
components/         InstallButton, InteractiveDiff, WaitlistForm, setup notice, status badge
lib/db/             Drizzle schema and Neon client
lib/engine/         filtering, detection, discovery, fixtures, patching, LLM, PR
lib/github/         App auth, repo snapshots, webhook verification, PR API
lib/inngest/        queue client and functions
lib/pipeline/       server-side push pipeline
scripts/            CLI entry point
.github/workflows/  CI and the self-hosted sync action
```
