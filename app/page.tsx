import InstallButton from "@/components/InstallButton";
import InteractiveDiff from "@/components/InteractiveDiff";
import WaitlistForm from "@/components/WaitlistForm";

const steps = [
  {
    label: "Watch",
    title: "Read the push",
    description:
      "A GitHub webhook fires on every push to your default branch. Watchdocs reads the diff.",
  },
  {
    label: "Filter",
    title: "Check the contract",
    description:
      "Route paths, HTTP methods, request schemas, and error statuses are inspected. Internal refactors stop here.",
  },
  {
    label: "Map",
    title: "Find the right pages",
    description:
      "Watchdocs ranks the docs that mention the changed endpoint and always includes llms.txt and OpenAPI files.",
  },
  {
    label: "Edit",
    title: "Patch the markdown",
    description:
      "The engine edits only the affected sections, keeps frontmatter intact, and checks its own diff.",
  },
  {
    label: "Review",
    title: "Open a pull request",
    description:
      "You get a branch, a written summary, and a PR assigned to the author of the code change.",
  },
];

const problems = [
  {
    title: "The code ships first",
    description:
      "A parameter changes on Tuesday. The quickstart still shows the old type on Friday. Integrators find out with a 400.",
  },
  {
    title: "Agents read stale files",
    description:
      "llms.txt and OpenAPI drift away from the handlers. Automated clients build requests from outdated payloads.",
  },
  {
    title: "Failure paths go unwritten",
    description:
      "Rate limits, auth errors, and empty results rarely make it into the docs, so support answers the same questions.",
  },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    note: "For evaluating on one repository.",
    features: ["1 repository", "30 doc updates per month", "Diff filtering"],
  },
  {
    name: "Pro",
    price: "$19",
    note: "For teams shipping APIs every week.",
    features: [
      "5 repositories",
      "200 doc updates per month",
      "llms.txt and OpenAPI sync",
      "Failure documentation",
    ],
  },
  {
    name: "Team",
    price: "$49",
    note: "For organizations with high commit volume.",
    features: [
      "20 repositories",
      "1,000 doc updates per month",
      "Custom prompt templates",
      "Priority support",
    ],
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-paper font-sans text-ink">
      <header className="sticky top-0 z-50 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <a href="#" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink font-mono text-sm font-bold text-paper">
              W
            </span>
            <span className="text-base font-semibold tracking-tight">
              Watchdocs
            </span>
          </a>

          <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
            <a href="#how-it-works" className="transition-colors hover:text-ink">
              How it works
            </a>
            <a href="#example-pr" className="transition-colors hover:text-ink">
              Example PR
            </a>
            <a href="#pricing" className="transition-colors hover:text-ink">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="#waitlist"
              className="hidden text-sm text-muted transition-colors hover:text-ink sm:block"
            >
              Join the waitlist
            </a>
            <InstallButton />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="border-b border-line px-4 pb-20 pt-16">
          <div className="mx-auto max-w-4xl text-center">
            <p className="mb-5 font-mono text-xs uppercase tracking-[0.2em] text-muted">
              GitHub App for API documentation
            </p>

            <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
              Watchdocs opens a pull request when your API changes and your docs
              are out of date.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
              Install the GitHub App, pick a repo, review the PR. Nothing merges
              on its own.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <InstallButton className="w-full sm:w-auto" />
              <a
                href="#waitlist"
                className="inline-flex w-full items-center justify-center rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-code sm:w-auto"
              >
                Join the waitlist
              </a>
            </div>

            <p className="mt-4 font-mono text-xs text-muted">
              Free during the beta. Every PR needs a human review.
            </p>

            <div className="mx-auto mt-14 max-w-3xl overflow-hidden rounded-xl border border-line bg-surface text-left shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5 font-mono text-xs text-muted">
                <span>commit 4a8f9c1</span>
                <span className="text-ink">
                  feat(api): add slippageBps and rate limiting to /swap
                </span>
              </div>
              <div className="grid divide-y divide-line lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                <div className="p-4">
                  <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted">
                    src/routes/swap.ts
                  </p>
                  <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-ink">
                    <span className="text-muted">@@ schema @@</span>
                    {"\n"} amount: z.string(),{"\n"}
                    <span className="rounded bg-success-soft px-1 text-success">
                      + slippageBps: z.number().max(500),
                    </span>
                    {"\n"}
                    <span className="text-muted">@@ handler @@</span>
                    {"\n"}
                    <span className="rounded bg-success-soft px-1 text-success">
                      + throw new ApiError(429, &quot;RATE_LIMITED&quot;);
                    </span>
                  </pre>
                </div>
                <div className="p-4">
                  <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted">
                    docs/quickstart.md
                  </p>
                  <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-ink">
                    <span className="text-muted">POST /swap</span>
                    {"\n"}
                    {'  "amount": "1000000",'}
                    {"\n"}
                    <span className="rounded bg-success-soft px-1 text-success">
                      + {`"slippageBps": 50 // optional, max 500`}
                    </span>
                  </pre>
                  <p className="mt-4 font-mono text-[11px] text-success">
                    PR opened for review
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-20">
          <div className="mx-auto max-w-5xl">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight">
                Documentation falls behind the moment a route changes.
              </h2>
              <p className="mt-3 text-muted">
                The gap is small at first. It compounds with every release.
              </p>
            </div>

            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {problems.map((problem) => (
                <div key={problem.title} className="border-t border-line pt-5">
                  <h3 className="text-base font-semibold">{problem.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {problem.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="border-y border-line bg-surface px-4 py-20"
        >
          <div className="mx-auto max-w-5xl">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight">
                How Watchdocs works
              </h2>
              <p className="mt-3 text-muted">
                Five steps run inside your repository. Nothing leaves git.
              </p>
            </div>

            <div className="mt-10">
              {steps.map((step) => (
                <div
                  key={step.label}
                  className="grid gap-2 border-t border-line py-5 sm:grid-cols-[140px_1fr] sm:gap-8"
                >
                  <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                    {step.label}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold">{step.title}</h3>
                    <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="example-pr" className="px-4 py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight">
                See the diff Watchdocs produces
              </h2>
              <p className="mt-3 text-muted">
                One route change, three documentation files, one pull request.
              </p>
            </div>

            <div className="mt-10">
              <InteractiveDiff />
            </div>
          </div>
        </section>

        <section
          id="pricing"
          className="border-y border-line bg-surface px-4 py-20"
        >
          <div className="mx-auto max-w-5xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight">
                Flat pricing
              </h2>
              <p className="mt-3 text-muted">
                Plans attach to a GitHub installation. Everything is free during
                the beta.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className="flex flex-col rounded-xl border border-line bg-paper p-6"
                >
                  <h3 className="text-base font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted">{plan.note}</p>
                  <p className="mt-5 font-mono text-4xl font-semibold">
                    {plan.price}
                    <span className="ml-1 text-sm font-normal text-muted">
                      /mo
                    </span>
                  </p>
                  <ul className="mt-6 flex-1 space-y-2 text-sm text-muted">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <span className="text-line">/</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#waitlist"
                    className="mt-8 inline-flex items-center justify-center rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-code"
                  >
                    Join the waitlist
                  </a>
                </div>
              ))}
            </div>

            <div className="mt-8 space-y-2 text-center text-xs text-muted">
              <p>
                Overage packs on Pro and Team: $10 per extra 250 updates. One
                opened or updated PR counts as one update.
              </p>
              <p>
                Enterprise adds SSO, bring-your-own LLM key, audit logs, and an
                SLA.{" "}
                <a href="#waitlist" className="underline hover:text-ink">
                  Contact us
                </a>
                .
              </p>
            </div>
          </div>
        </section>

        <section id="waitlist" className="px-4 py-20">
          <div className="mx-auto max-w-4xl">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight">
                Get early access
              </h2>
              <p className="mt-3 text-muted">
                We are onboarding a small group of API teams. Tell us what you
                ship and we will reach out when your spot opens.
              </p>
            </div>

            <div className="mt-8">
              <WaitlistForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface px-4 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-xs text-muted sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink">Watchdocs</span>
            <span>/</span>
            <span>Docs that keep up with your code.</span>
          </div>
          <p>Built for teams that ship APIs.</p>
        </div>
      </footer>
    </div>
  );
}
