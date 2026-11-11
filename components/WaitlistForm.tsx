"use client";

import { useState } from "react";

export default function WaitlistForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [apiType, setApiType] = useState("SaaS API");
  const [painPoint, setPainPoint] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
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

      const body = (await res.json()) as {
        duplicate?: boolean;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(body.error ?? "Submission failed");
      }

      setDuplicate(Boolean(body.duplicate));
      setSubmitted(true);
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Could not save your spot. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-success/30 bg-success-soft p-8 text-center">
        <h3 className="text-xl font-semibold text-ink">
          {duplicate ? "You are already on the list." : "You are in."}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          We are onboarding a small group of API teams. We will reach out to{" "}
          <span className="font-medium text-ink">{email}</span> when your spot
          opens.
        </p>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder-muted focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink";
  const labelClass = "mb-1.5 block font-mono text-xs text-muted";

  return (
    <div className="mx-auto max-w-xl rounded-xl border border-line bg-surface p-6 shadow-sm md:p-8">
      {step === 1 ? (
        <form onSubmit={handleStepOne} className="space-y-4">
          <div>
            <label htmlFor="email" className={labelClass}>
              Work email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@company.com"
              className={inputClass}
            />
          </div>

          {errorMsg && (
            <p className="font-mono text-xs text-danger">{errorMsg}</p>
          )}

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-ink/85"
          >
            Join the waitlist
            <span aria-hidden="true">&rarr;</span>
          </button>
          <p className="text-center font-mono text-[11px] text-muted">
            Step 1 of 2
          </p>
        </form>
      ) : (
        <form onSubmit={handleFinalSubmit} className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-line bg-paper p-3 font-mono text-xs">
            <span className="max-w-[240px] truncate text-muted">{email}</span>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-[11px] text-ink underline"
            >
              Change
            </button>
          </div>

          <div>
            <label htmlFor="repo" className={labelClass}>
              GitHub repository (optional)
            </label>
            <input
              id="repo"
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="github.com/org/api-service"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="apiType" className={labelClass}>
              What do you ship?
            </label>
            <select
              id="apiType"
              value={apiType}
              onChange={(e) => setApiType(e.target.value)}
              className={inputClass}
            >
              <option value="SaaS API">B2B SaaS / developer API</option>
              <option value="AI Agent API">AI agent / LLM API</option>
              <option value="DeFi / Web3">DeFi / Web3 protocol</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="pain" className={labelClass}>
              Where do your docs fall behind?
            </label>
            <textarea
              id="pain"
              rows={2}
              value={painPoint}
              onChange={(e) => setPainPoint(e.target.value)}
              placeholder="Rate limits rarely get documented, and quickstarts go stale after endpoint changes."
              className={inputClass}
            />
          </div>

          {errorMsg && (
            <p className="font-mono text-xs text-danger">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-ink/85 disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Complete registration"}
          </button>
        </form>
      )}
    </div>
  );
}
