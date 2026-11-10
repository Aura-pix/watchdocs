import InteractiveDiff from "@/components/InteractiveDiff";
import WaitlistForm from "@/components/WaitlistForm";

export default function Home() {
  return (
    <div className="min-h-screen bg-gh-bg text-zinc-100 flex flex-col font-sans">
      {/* 1. NAVBAR */}
      <header className="sticky top-0 z-50 bg-gh-bg/80 backdrop-blur-md border-b border-gh-border/70">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <a
            href="#"
            className="flex items-center gap-2 font-mono font-bold text-lg text-white"
          >
            <span className="w-6 h-6 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-xs">
              W
            </span>
            Watchdocs
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-300">
            <a
              href="#how-it-works"
              className="hover:text-white transition-colors"
            >
              How it works
            </a>
            <a
              href="#what-it-fixes"
              className="hover:text-white transition-colors"
            >
              What it fixes
            </a>
            <a
              href="#example-pr"
              className="hover:text-white transition-colors"
            >
              Example PR
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              Pricing
            </a>
          </nav>

          <a
            href="#waitlist"
            className="text-xs font-medium bg-gh-surface hover:bg-zinc-800 border border-gh-border px-3.5 py-2 rounded-md transition-colors text-zinc-200"
          >
            Join Waitlist
          </a>
        </div>
      </header>

      <main className="flex-1">
        {/* 2. HERO */}
        <section className="pt-20 pb-16 px-4 border-b border-gh-border/60">
          <div className="max-w-4xl mx-auto text-center">
            {/* Tag / Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-zinc-900 border border-zinc-700 text-zinc-300 mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              CLI + GitHub Action for Fast-Moving APIs
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
              Your docs update themselves. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-500">
                You just review the PR.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-8 leading-relaxed">
              Watchdocs watches your commits, detects when your API actually
              changed, edits the right docs files, and opens a PR. No more stale
              docs. No more &quot;docs outdated&quot; tickets.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <a
                href="#waitlist"
                className="w-full sm:w-auto px-6 py-3 bg-gh-green hover:bg-gh-greenHover text-white font-medium rounded-lg text-sm transition-colors text-center"
              >
                Join the Waitlist
              </a>
              <a
                href="#example-pr"
                className="w-full sm:w-auto px-6 py-3 bg-gh-surface hover:bg-zinc-800 border border-gh-border text-zinc-300 font-medium rounded-lg text-sm transition-colors text-center"
              >
                See an example PR ↓
              </a>
            </div>

            <p className="text-xs font-mono text-zinc-400">
              For teams shipping APIs that change fast.{" "}
              <strong className="text-zinc-300">No auto-merge. Ever.</strong>
            </p>

            {/* Visual Hero Mock: Real GitHub PR Card */}
            <div className="mt-12 text-left max-w-3xl mx-auto bg-gh-canvas border border-gh-border rounded-xl shadow-2xl overflow-hidden">
              <div className="bg-gh-surface px-4 py-3 border-b border-gh-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <span className="bg-emerald-600 text-white font-mono px-2 py-0.5 rounded-full font-semibold">
                    Open
                  </span>
                  <span className="text-zinc-300 font-mono">
                    watchdocs-bot wants to merge 1 commit into
                  </span>
                  <span className="bg-zinc-800 text-zinc-300 font-mono px-1.5 py-0.5 rounded">
                    main
                  </span>
                </div>
                <span className="text-xs font-mono text-zinc-400">#142</span>
              </div>
              <div className="p-4 sm:p-5">
                <h2 className="text-base sm:text-lg font-bold text-white mb-2">
                  docs: update for POST /swap changes and rate limit specs
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mb-4 font-mono">
                  <span>+4 files modified</span>
                  <span>•</span>
                  <span className="text-emerald-400">+48 additions</span>
                  <span>•</span>
                  <span className="text-rose-400">-6 deletions</span>
                </div>

                <div className="space-y-1.5 text-xs font-mono bg-zinc-950/70 p-3 rounded-lg border border-zinc-800">
                  <div className="flex justify-between text-zinc-300">
                    <span>📄 docs/quickstart.md</span>
                    <span className="text-emerald-400">+12 -2</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>📄 docs/swap-guide.md</span>
                    <span className="text-emerald-400">+18 -4</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>📄 docs/errors.md</span>
                    <span className="text-emerald-400">+9 -0</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>📄 public/llms.txt</span>
                    <span className="text-emerald-400">+9 -0</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. PROBLEM SECTION */}
        <section className="py-20 px-4 max-w-6xl mx-auto border-b border-gh-border/60">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Docs rot in days. Your API changes in minutes.
            </h2>
            <p className="text-zinc-400 text-sm">
              Engineers ship endpoints to staging and production. Updating
              guides, failure states, and agent specs is perpetually delayed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gh-surface border border-gh-border p-6 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center font-mono text-sm mb-4">
                01
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                Your API shipped. Your docs didn&apos;t.
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                You changed <code className="text-zinc-200">POST /swap</code>{" "}
                parameter constraints, but your quickstart still displays
                obsolete types. Integrators hit validation errors on Day 1.
              </p>
            </div>

            <div className="bg-gh-surface border border-gh-border p-6 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-mono text-sm mb-4">
                02
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                AI agents read your stale docs.
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                When your <code className="text-zinc-200">llms.txt</code> and
                OpenAPI files are out of sync, autonomous agents hallucinate
                obsolete payloads and break customer automations.
              </p>
            </div>

            <div className="bg-gh-surface border border-gh-border p-6 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-mono text-sm mb-4">
                03
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                Failure docs are missing.
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Rarely does anyone document 429 rate limits, pagination cursors,
                auth timeouts, or empty arrays. Yet lack of failure docs is
                precisely what stalls developer integrations.
              </p>
            </div>
          </div>
        </section>

        {/* 4. HOW IT WORKS */}
        <section
          id="how-it-works"
          className="py-20 px-4 max-w-5xl mx-auto border-b border-gh-border/60"
        >
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">
              Automated Lifecycle
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1 mb-3">
              How Watchdocs Keeps You in Sync
            </h2>
            <p className="text-zinc-400 text-sm">
              5 lightweight steps that run quietly inside your standard CI/CD
              pipeline.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                step: "01",
                title: "Watch",
                desc: "GitHub Action triggers on push or merged PR to extract the raw git diff.",
              },
              {
                step: "02",
                title: "Filter",
                desc: "Intelligently ignores tests, CSS, internal tooling, and CI configs. Triggers exclusively when route handlers, controllers, or schemas change.",
              },
              {
                step: "03",
                title: "Map",
                desc: "Builds a dependency map from endpoints to documentation files (e.g. POST /swap ➔ quickstart.md, swap-guide.md, errors.md).",
              },
              {
                step: "04",
                title: "Edit",
                desc: "LLM analyzes the previous documentation, structured code diffs, and updated spec. It precisely edits only the impacted markdown sections.",
              },
              {
                step: "05",
                title: "PR",
                desc: "Creates an isolated branch, commits the markdown diffs, and opens a clean PR with an executive change summary. Your team reviews and merges. Never auto-merges.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-lg border border-gh-border bg-gh-surface/60 hover:bg-gh-surface transition-colors"
              >
                <span className="font-mono text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded">
                  {item.step}
                </span>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. WHAT IT FIXES */}
        <section
          id="what-it-fixes"
          className="py-20 px-4 max-w-5xl mx-auto border-b border-gh-border/60"
        >
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">
              Complete Documentation Coverage
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1 mb-3">
              Not just API reference. Real markdown.
            </h2>
            <p className="text-zinc-400 text-sm">
              Autogenerated OpenAPI specs alone aren&apos;t sufficient.
              Watchdocs updates real human guides.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              "Edits prose guides, errors, and quickstarts — not just raw endpoint schemas.",
              "Adds failure docs: auth failures, rate limits, pagination, retries, and edge cases.",
              "Regenerates llms.txt + OpenAPI in the same PR for autonomous AI agents.",
              "Batches multiple commits to avoid opening spam PRs on every single push.",
            ].map((text, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-4 bg-gh-surface border border-gh-border rounded-lg"
              >
                <span className="text-emerald-400 font-mono text-base leading-none">
                  ✓
                </span>
                <span className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  {text}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 6. WHAT IT DOESN'T DO (Radical Honesty) */}
        <section className="py-16 px-4 max-w-4xl mx-auto border-b border-gh-border/60">
          <div className="border border-zinc-800 bg-zinc-950/80 rounded-xl p-6 sm:p-8">
            <h3 className="text-base font-mono font-bold text-zinc-200 mb-2 flex items-center gap-2">
              <span className="text-zinc-400">#</span> What Watchdocs
              doesn&apos;t do (by design)
            </h3>
            <p className="text-xs text-zinc-400 mb-6">
              We focus solely on keeping documentation accurate in git. We leave
              the rest to best-in-class tools.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-zinc-400">
              <div>
                <p className="font-semibold text-zinc-300 mb-1">
                  No full docs site builder
                </p>
                <p>
                  We do not host your website. We work directly with Mintlify,
                  ReadMe, Docusaurus, or GitBook.
                </p>
              </div>
              <div>
                <p className="font-semibold text-zinc-300 mb-1">
                  No bloated web UI
                </p>
                <p>
                  Watchdocs lives entirely in your terminal and CI workflow.
                  Config is maintained in simple JSON.
                </p>
              </div>
              <div>
                <p className="font-semibold text-zinc-300 mb-1">
                  No hallucinating context
                </p>
                <p>
                  We extract usage examples strictly from actual tests, PR
                  descriptions, and verified code diffs.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 7. EXAMPLE PR (Interactive Cause & Effect Section) */}
        <section
          id="example-pr"
          className="py-20 px-4 max-w-5xl mx-auto border-b border-gh-border/60"
        >
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">
              Live Preview
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1 mb-2">
              See the diff Watchdocs generates
            </h2>
            <p className="text-zinc-400 text-sm">
              Watch how a single route change automatically produces verified
              markdown diffs across 3 separate files.
            </p>
          </div>

          <InteractiveDiff />
        </section>

        {/* 8. PRICING */}
        <section
          id="pricing"
          className="py-20 px-4 max-w-5xl mx-auto border-b border-gh-border/60"
        >
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">
              Transparent Pricing
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1 mb-2">
              Simple, flat pricing.
            </h2>
            <p className="text-zinc-400 text-sm">
              Predictable costs based on repo activity. Never billed per-token.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="bg-gh-surface border border-gh-border rounded-xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-white text-lg">Free</h3>
                <p className="text-xs text-zinc-400 mt-1 mb-4">
                  Perfect to evaluate on side projects.
                </p>
                <div className="text-3xl font-extrabold text-white font-mono mb-6">
                  $0
                </div>

                <ul className="space-y-2.5 text-xs text-zinc-300 font-mono mb-8">
                  <li>✓ 30 doc updates/mo</li>
                  <li>✓ 1 GitHub repository</li>
                  <li>✓ Basic diff filtering</li>
                  <li>✓ Guides & quickstart</li>
                </ul>
              </div>

              <a
                href="#waitlist"
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-medium text-center transition-colors block"
              >
                Join Waitlist
              </a>
            </div>

            {/* Pro (Popular) */}
            <div className="bg-gh-surface border-2 border-emerald-500/80 rounded-xl p-6 relative flex flex-col justify-between shadow-lg shadow-emerald-950/20">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-zinc-950 text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                Most Popular
              </span>

              <div>
                <h3 className="font-bold text-white text-lg">Pro</h3>
                <p className="text-xs text-zinc-400 mt-1 mb-4">
                  For active teams shipping APIs weekly.
                </p>
                <div className="text-3xl font-extrabold text-white font-mono mb-6">
                  $19
                  <span className="text-xs text-zinc-400 font-sans font-normal">
                    /mo
                  </span>
                </div>

                <ul className="space-y-2.5 text-xs text-zinc-300 font-mono mb-8">
                  <li>✓ 200 doc updates/mo</li>
                  <li>✓ Up to 5 repositories</li>
                  <li>✓ llms.txt & OpenAPI sync</li>
                  <li>✓ Failure documentation generator</li>
                  <li>✓ Batched PR updates</li>
                </ul>
              </div>

              <a
                href="#waitlist"
                className="w-full py-2.5 bg-gh-green hover:bg-gh-greenHover text-white rounded-lg text-xs font-medium text-center transition-colors block"
              >
                Join Waitlist
              </a>
            </div>

            {/* Team */}
            <div className="bg-gh-surface border border-gh-border rounded-xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-white text-lg">Team</h3>
                <p className="text-xs text-zinc-400 mt-1 mb-4">
                  For organizations with high commit volume.
                </p>
                <div className="text-3xl font-extrabold text-white font-mono mb-6">
                  $49
                  <span className="text-xs text-zinc-400 font-sans font-normal">
                    /mo
                  </span>
                </div>

                <ul className="space-y-2.5 text-xs text-zinc-300 font-mono mb-8">
                  <li>✓ Unlimited doc updates</li>
                  <li>✓ Unlimited repositories</li>
                  <li>✓ Custom prompt templates</li>
                  <li>✓ Priority SLA & support</li>
                </ul>
              </div>

              <a
                href="#waitlist"
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-medium text-center transition-colors block"
              >
                Join Waitlist
              </a>
            </div>
          </div>

          <p className="text-center text-xs font-mono text-zinc-400 mt-8">
            Flat monthly rate. No meter on tokens, LLM calls, or doc character
            count.
          </p>
        </section>

        {/* 9. WAITLIST FORM SECTION */}
        <section id="waitlist" className="py-20 px-4 max-w-4xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">
              Limited Design Partner Cohort
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1 mb-3">
              Get early access. Help shape V1.
            </h2>
            <p className="text-zinc-400 text-sm">
              We&apos;re validating with 10 API teams first. Join the waitlist
              and let us know what API you ship.
            </p>
          </div>

          <WaitlistForm />
        </section>
      </main>

      {/* 10. FOOTER */}
      <footer className="border-t border-gh-border bg-gh-surface py-10 px-4 text-xs font-mono text-zinc-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold">Watchdocs</span>
            <span>—</span>
            <span>Docs that keep up with your code.</span>
          </div>
          <p className="text-zinc-400">
            Built for developers who hate stale docs.
          </p>
        </div>
      </footer>
    </div>
  );
}
