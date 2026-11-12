# Testing Watchdocs

This is the test plan in three stages:

1. **Stage 1 — Your testing.** You run the product locally against a sandbox repository with real GitHub, database, Inngest, Gemini, and Stripe test-mode credentials. This is where you find functional bugs.
2. **Stage 2 — User testing.** A small group of design partners installs the App on their own repositories with you watching. This is where you find onboarding and trust problems.
3. **Stage 3 — Public beta.** The product is deployed, listed, and open to strangers. This is where you watch reliability, abuse, and support load.

Do not skip Stage 1. Most of what follows assumes you can watch the run rows and server logs while you test.

---

## 0. Before you start

### 0.1 Create a sandbox repository

Create a throwaway GitHub repository with this shape:

```text
src/routes/swap.ts          # an API handler
docs/quickstart.md          # mentions POST /swap
docs/errors.md              # mentions status codes
tests/swap.test.ts          # request/response fixtures
```

Useful test commits:

| Commit | Expected result |
| --- | --- |
| Add an optional `slippageBps` field to the swap schema | Watchdocs opens a PR that updates `docs/quickstart.md` |
| Add `throw new ApiError(429, "RATE_LIMITED")` | Watchdocs updates the error docs |
| Rename a local variable | Skipped: no contract change |
| Change only a README | Skipped: no watched file |
| Push to a feature branch | Skipped: not the default branch |
| Push to a `watchdocs/...` branch | Skipped: Watchdocs branch |
| Force a push from a bot account | Skipped: bot sender |
| Push 300+ changed files in one commit | Run fails with a clear "too large" error |

### 0.2 Configure `.env.local`

You need all of these to exercise the full flow:

```text
DATABASE_URL=
AUTH_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY_BASE64=
GITHUB_APP_SLUG=
GITHUB_WEBHOOK_SECRET=
GEMINI_API_KEY=
INNGEST_EVENT_KEY=          # optional locally; dev mode is automatic
INNGEST_SIGNING_KEY=        # optional locally
```

Add these only when you reach the billing tests:

```text
STRIPE_SECRET_KEY=          # test mode
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
STRIPE_PRICE_PRO=
STRIPE_PRICE_TEAM=
STRIPE_PRICE_OVERAGE=
```

### 0.3 Apply the schema and start everything

```bash
npm install
npm run db:push
npm run dev:inngest
npm run dev
```

Then expose the app to GitHub with a tunnel (cloudflared, ngrok, or similar) and set the GitHub App's webhook and setup URLs to the tunnel URL. The README has the exact App settings.

### 0.4 Confirm the basics

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] `/api/inngest` returns 200 in development
- [ ] The Inngest dev dashboard shows the `watchdocs-process-push` function

---

## Stage 1 — Your testing (developer QA)

### 1.1 Public pages and SEO

- [ ] `/` renders the landing page and the install button
- [ ] `/docs` lists the docs and each link opens
- [ ] `/docs/overview` and `/docs/configuration` render headings, tables, and code blocks
- [ ] `/changelog`, `/privacy`, `/terms` render
- [ ] A bad URL shows the 404 page
- [ ] `/robots.txt` and `/sitemap.xml` return valid output with the production URL
- [ ] OpenGraph and Twitter tags point at `/og.png`
- [ ] Response headers include `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy`

### 1.2 Auth and installation

- [ ] Signed out, `/app` redirects to `/login?callbackUrl=/app`
- [ ] Sign in with GitHub succeeds and lands on `/app` or the saved callback
- [ ] The install button opens the GitHub App installation screen
- [ ] After installing, GitHub redirects to `/app/install/callback`
- [ ] Repositories appear on the dashboard, paused by default
- [ ] An installation you cannot manage is rejected at the callback
- [ ] Sign out returns you to `/`
- [ ] `/api/auth/session` does **not** expose a GitHub access token

### 1.3 Webhook gate

- [ ] A push with a valid signature returns 202 and queues a run
- [ ] A push with a wrong signature returns 401
- [ ] A request without `X-GitHub-Delivery` or `X-GitHub-Event` returns 400
- [ ] Replaying the same delivery id returns `{ duplicate: true }` and creates no second run
- [ ] With `GITHUB_WEBHOOK_SECRET` unset, the route returns 503
- [ ] Unhandled events are acknowledged and ignored

### 1.4 Pipeline: happy path

With a watched repo enabled and a contract-changing commit:

- [ ] A run row appears with status `running`, then `opened`
- [ ] The run records the endpoint, changed files, doc before/after, tokens, and cost
- [ ] A `watchdocs/sync-<short-sha>` branch appears
- [ ] A pull request opens with a useful title and body
- [ ] The PR lists the files it edited and assigns the original author as reviewer
- [ ] Labels are applied only if they already exist in the repository
- [ ] `usage_monthly.pr_count` increases by one
- [ ] The dashboard shows the run and the open PR count

### 1.5 Pipeline: zero-cost skips

For each case, confirm a run row is recorded as `skipped` with a reason, and that no PR opens:

- [ ] Internal-only code change
- [ ] No watched files changed
- [ ] Push to a non-default branch
- [ ] Push to a `watchdocs/...` branch
- [ ] Bot sender
- [ ] Repository paused
- [ ] No documentation matched
- [ ] Model returned no edits

### 1.6 Pipeline: updates and outcomes

- [ ] Push a second contract change to the same repo: the existing Watchdocs PR is updated, not duplicated
- [ ] Close the PR on GitHub: the run status becomes `closed`
- [ ] Open and merge a PR: the run status becomes `merged`
- [ ] Manually edit the Watchdocs branch, then push another change: your edit is preserved except for files Watchdocs rewrites

### 1.7 Dashboard, runs, and repo settings

- [ ] `/app` shows repositories, open PRs, and recent runs
- [ ] Pause and enable a repository from the dashboard
- [ ] `/app/runs` lists history and `/app/runs/[id]` shows the diff, files, tokens, cost, and errors
- [ ] `/app/repos/[id]` saves default branch, branch prefix, watched paths, docs paths, and labels
- [ ] Add and remove a doc mapping; the mapped page is included in the next matching run
- [ ] Invalid settings (absolute paths, `..`, bad branch names) are rejected with a message
- [ ] User B cannot open user A's repo settings or run detail (expect 404)

### 1.8 Billing (Stripe test mode)

Use Stripe test keys and test cards. Add a webhook endpoint at `/api/stripe/webhook` and forward it locally with the Stripe CLI.

- [ ] With billing env unset, `/app/billing` shows the beta placeholder
- [ ] With billing env set, `/app/billing` shows plans and usage
- [ ] Pro checkout completes with a test card and the installation plan becomes `pro`
- [ ] The billing portal opens and returns to `/app/billing`
- [ ] Downgrade cancels the subscription and returns the plan to `free`
- [ ] Buying an overage pack increases `overage_packs` by the quantity
- [ ] Free plan: enabling a second repository is blocked with a plan message
- [ ] Free plan: a run for a second enabled repository is skipped with a reason (test by enabling via DB)
- [ ] Update limit: set `usage_monthly.pr_count` near the limit in `npm run db:studio`, then push; the run is skipped at the limit
- [ ] An overage pack raises the update limit by 250
- [ ] Stripe webhook with a bad signature is rejected

### 1.9 Reliability and idempotency

- [ ] Re-sending the same GitHub delivery creates no duplicate run
- [ ] Re-running a failed Inngest job reuses the same run row
- [ ] Usage is counted once even if a run is retried
- [ ] A transient GitHub failure retries; a validation failure does not
- [ ] Failed runs show the error text in run detail

### 1.10 Security and data

- [ ] Webhook signature checks are enforced
- [ ] Cross-user access returns 404 for repos, runs, and settings
- [ ] Account deletion removes installations, repos, runs, and usage, then signs you out
- [ ] GitHub App installations remain on GitHub after account deletion (expected)
- [ ] Secrets never appear in client HTML or `session` responses

### 1.11 Dark mode, responsive, and accessibility

- [ ] The theme toggle switches between light and dark on the landing, app, and login pages
- [ ] System preference is respected on first visit
- [ ] No flash of the wrong theme on load
- [ ] All pages are readable in both themes (watch success/danger soft colors)
- [ ] Layout works at mobile width (navigation, tables, forms)
- [ ] Buttons and inputs are keyboard reachable and have labels

### Stage 1 exit criteria

- No open bugs in the happy path or security checks.
- Every skip reason is understandable in the UI.
- Stripe test-mode flows work end to end.
- You would be comfortable letting a friendly stranger try it.

---

## Stage 2 — User testing (design partners)

Recruit 3–5 teams that ship APIs and keep docs in the same repository. Do these sessions live or with a short recorded walkthrough. Your job is to watch, not to explain.

### 2.1 Before the session

- [ ] Confirm the user can install GitHub Apps on the target account or org
- [ ] Ask for a repository with API routes and markdown docs
- [ ] Ask them to have one recent API change in mind
- [ ] Keep support and logs open during the session

### 2.2 Script

1. Ask them to install the App and connect one repository without help.
2. Ask them to find where to configure watched paths.
3. Push (or have them push) a small API change to the default branch.
4. Watch them react to the pull request. Do they understand what changed and why?
5. Ask them to close the PR without merging, then push again and describe what they expect.
6. Ask where they would look to see cost and history.

Do not guide them unless they are fully stuck for more than two minutes. Note where they hesitate.

### 2.3 Questions

- What did you think would happen when you installed it?
- Was the pull request something you would merge? What was missing or wrong?
- Did the edits touch anything they should not have?
- What would make you uninstall it?
- What would you expect to pay for this?
- Would you trust it on your main repository? Why or why not?

### 2.4 What to watch for

- [ ] Users cannot find the dashboard after installing
- [ ] Users expect automatic merges (they misunderstand the safety model)
- [ ] Edits are technically valid but read badly
- [ ] The PR is noisy for small changes
- [ ] Users cannot tell why a run was skipped
- [ ] Users cannot find settings or billing
- [ ] Users expect the docs site to be generated for them (it is not; this is your own site)

### 2.5 Success signals

- At least one partner merges a Watchdocs PR with only minor edits.
- Partners can explain the safety model in their own words.
- No partner asks to turn off the product because of noise.
- You collect a list of concrete prompt and ranking improvements.

### Stage 2 exit criteria

- Onboarding works without you narrating.
- At least one real merged PR from a partner.
- No trust-breaking defects.

---

## Stage 3 — Public beta

### 3.1 Production launch checklist

- [ ] Production database created; `npm run db:push` applied all migrations
- [ ] All production environment variables set (see README)
- [ ] Domain configured with HTTPS; `NEXT_PUBLIC_APP_URL` matches it
- [ ] GitHub App URLs updated to production (homepage, callback, setup, webhook)
- [ ] Production webhook secret rotated and set
- [ ] Inngest production keys set and the app synced at `/api/inngest`
- [ ] Gemini key set with a spend limit
- [ ] Stripe live keys and webhook configured, customer portal enabled
- [ ] Email sender verified in Resend; waitlist confirmation works
- [ ] `robots.txt` and `sitemap.xml` use the production domain
- [ ] Backups enabled on the database
- [ ] Error monitoring and uptime checks configured

### 3.2 Marketplace and trust

- [ ] App name, logo, screenshots, and short description ready
- [ ] Privacy and terms URLs point at `/privacy` and `/terms`
- [ ] Support email and a response expectation published
- [ ] Permissions still limited to Contents, Pull requests, Metadata
- [ ] Webhook events still limited to push, pull_request, installation, installation_repositories

### 3.3 Beta guardrails

- [ ] Decide whether billing is on or everything stays free during beta
- [ ] If billing is off, confirm plan limits are not enforced
- [ ] If billing is on, confirm Free/Pro/Team limits match the pricing page
- [ ] Set a per-installation update cap as an abuse guard
- [ ] Know how to pause a single installation (`installations.status`)
- [ ] Know how to pause the pipeline globally (stop the queued function or revoke the Inngest event key)
- [ ] Test account deletion and data removal on a real account

### 3.4 Monitoring and metrics

Watch these daily during the first weeks:

- Installs and repositories enabled
- Time from install to first pull request
- Runs by status (`opened`, `skipped`, `failed`) and skip reasons
- PRs opened, updated, merged, and closed without merge
- Failure rate and top error messages
- Tokens and cost per PR; margin against the plan
- Support volume and themes
- Uninstall rate and reasons

### 3.5 Support runbook

For each support report, capture the user, installation id, repository, commit, delivery id, and run id. Then check:

1. `webhook_deliveries` for the delivery.
2. `runs` for status, `skip_reason`, and `error`.
3. Inngest for retries and failures.
4. GitHub for the branch and PR state.
5. Stripe for plan and subscription state (billing issues only).

Do not ask users for source code. Ask for the repository name and commit SHA.

### 3.6 Rollback and kill switches

- [ ] Pause new installations by disabling the install URL
- [ ] Stop processing by disabling the Inngest function or removing its event key
- [ ] Revert a bad deploy on the hosting platform
- [ ] Restore the database from the latest backup if migrations fail
- [ ] Revoke the GitHub App private key and rotate secrets after a leak

### Stage 3 exit criteria

- Stable install-to-PR funnel for at least two weeks.
- Merge rate and noise level acceptable to early users.
- Cost per PR known and within plan margins.
- No unresolved security or data-loss issues.

---

## Known gaps to test explicitly

- **Model quality.** The pipeline can be correct and still write awkward docs. Read real PRs closely.
- **Large pushes.** GitHub caps the compare file list; the 300-file guard fails the run by design.
- **Complex repos.** Monorepos, multiple docs roots, and generated docs are not covered by the sandbox.
- **Multiple installations.** One user managing several orgs is supported in the data model but lightly tested.
- **Stripe live mode.** Test mode and live mode differ in webhook retries and tax behavior.
- **Email deliverability.** Resend sender reputation is outside the code.
- **Inngest production.** Retry behavior and concurrency in production differ from local dev.
- **Gemini rate limits.** A busy installation may hit provider limits; failures should surface in run history.

## Test data cleanup

To reset your local environment, delete the installation from the dashboard, or in `npm run db:studio` delete rows from `installations` for your test account. Repositories, runs, doc mappings, and usage cascade. Then uninstall the App from the sandbox repository and delete the test branches and PRs on GitHub.

For Stripe test mode, cancel test subscriptions and delete test customers in the Stripe dashboard so later tests start clean.
