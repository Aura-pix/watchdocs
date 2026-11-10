"use client";

import { useState } from "react";

export default function WaitlistForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [apiType, setApiType] = useState("DeFi / Web3");
  const [painPoint, setPainPoint] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleStepOne = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMsg("Please enter a valid work email.");
      return;
    }
    setErrorMsg("");
    setStep(2);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, repoUrl, apiType, painPoint }),
      });

      if (!res.ok) throw new Error("Submission failed");
      setSubmitted(true);
    } catch {
      // Fallback: save to localStorage if backend fetch fails
      const fallbackList = JSON.parse(
        localStorage.getItem("watchdocs_waitlist") || "[]",
      );
      fallbackList.push({
        email,
        repoUrl,
        apiType,
        painPoint,
        date: new Date().toISOString(),
      });
      localStorage.setItem("watchdocs_waitlist", JSON.stringify(fallbackList));
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="border border-emerald-500/40 bg-emerald-950/20 rounded-xl p-8 text-center max-w-lg mx-auto">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mb-4 font-mono font-bold text-lg">
          ✓
        </div>
        <h3 className="text-xl font-bold text-white mb-2">You&apos;re in.</h3>
        <p className="text-zinc-300 text-sm mb-4">
          We&apos;re onboarding our first 10 API teams. We&apos;ll reach out to{" "}
          <span className="text-white font-medium underline">{email}</span> as
          soon as your spot opens.
        </p>
        <span className="inline-block text-xs font-mono text-emerald-400/80 bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-500/30">
          Status: Waitlist Priority #14
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto bg-gh-surface border border-gh-border p-6 md:p-8 rounded-xl shadow-2xl">
      {step === 1 ? (
        <form onSubmit={handleStepOne} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2"
            >
              Work Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@company.com"
              className="w-full bg-[#0d1117] border border-gh-border rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono text-sm"
            />
          </div>

          {errorMsg && (
            <p className="text-rose-400 text-xs font-mono">{errorMsg}</p>
          )}

          <button
            type="submit"
            className="w-full bg-gh-green hover:bg-gh-greenHover text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
          >
            Join Waitlist
            <span className="font-mono text-xs">→</span>
          </button>
          <p className="text-[11px] text-zinc-400 text-center font-mono">
            Step 1 of 2: Reserve your spot with your email.
          </p>
        </form>
      ) : (
        <form onSubmit={handleFinalSubmit} className="space-y-4">
          <div className="bg-[#090d16] p-3 rounded-lg border border-gh-border flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400 truncate max-w-[240px]">
              {email}
            </span>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-emerald-400 hover:underline text-[11px]"
            >
              Change
            </button>
          </div>

          <div>
            <label
              htmlFor="repo"
              className="block text-xs font-mono text-zinc-400 mb-1"
            >
              GitHub Repo URL <span className="text-zinc-400">(Optional)</span>
            </label>
            <input
              id="repo"
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="github.com/org/api-service"
              className="w-full bg-[#0d1117] border border-gh-border rounded-lg px-3.5 py-2.5 text-white placeholder-zinc-500 text-sm font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label
              htmlFor="apiType"
              className="block text-xs font-mono text-zinc-400 mb-1"
            >
              What API do you ship?
            </label>
            <select
              id="apiType"
              value={apiType}
              onChange={(e) => setApiType(e.target.value)}
              className="w-full bg-[#0d1117] border border-gh-border rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="DeFi / Web3">DeFi / Web3 Protocol</option>
              <option value="AI Agent API">AI Agent / LLM API</option>
              <option value="SaaS API">B2B SaaS / Developer API</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="pain"
              className="block text-xs font-mono text-zinc-400 mb-1"
            >
              Biggest docs pain right now?
            </label>
            <textarea
              id="pain"
              rows={2}
              value={painPoint}
              onChange={(e) => setPainPoint(e.target.value)}
              placeholder="e.g. Failure codes never get documented, engineers change endpoints and forget quickstart..."
              className="w-full bg-[#0d1117] border border-gh-border rounded-lg px-3.5 py-2 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gh-green hover:bg-gh-greenHover disabled:opacity-50 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
          >
            {isSubmitting ? "Saving..." : "Complete Waitlist Registration"}
          </button>
        </form>
      )}
    </div>
  );
}
