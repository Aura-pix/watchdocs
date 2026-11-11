"use client";

import { useState } from "react";

type DocFile = "quickstart.md" | "errors.md" | "llms.txt";

const files: DocFile[] = ["quickstart.md", "errors.md", "llms.txt"];

export default function InteractiveDiff() {
  const [activeTab, setActiveTab] = useState<DocFile>("quickstart.md");

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded border border-line bg-surface px-2 py-0.5 font-mono text-muted">
            commit 4a8f9c1
          </span>
          <span className="font-medium text-ink">
            feat(api): add slippageBps and rate limiting to /swap
          </span>
        </div>
        <span className="font-mono text-muted">git push to main</span>
      </div>

      <div className="grid divide-y divide-line lg:grid-cols-12 lg:divide-x lg:divide-y-0">
        <div className="bg-code p-4 lg:col-span-5">
          <div className="mb-3 flex items-center justify-between border-b border-line pb-3">
            <span className="font-mono text-xs font-semibold text-muted">
              src/routes/swap.ts
            </span>
            <span className="font-mono text-[11px] text-muted">source diff</span>
          </div>

          <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-ink">
            <div className="select-none text-muted">
              @@ -14,6 +14,8 @@ handleSwap()
            </div>
            <div>&nbsp;&nbsp;const schema = z.object({"{"}</div>
            <div>&nbsp;&nbsp;&nbsp;&nbsp;tokenIn: z.string(),</div>
            <div>&nbsp;&nbsp;&nbsp;&nbsp;tokenOut: z.string(),</div>
            <div>&nbsp;&nbsp;&nbsp;&nbsp;amount: z.string(),</div>
            <div className="rounded bg-success-soft px-1 text-success">
              +&nbsp;&nbsp;&nbsp;slippageBps: z.number().max(500),
            </div>
            <div>&nbsp;&nbsp;{"}"});</div>
            <div>&nbsp;</div>
            <div className="select-none text-muted">@@ -42,3 +44,6 @@</div>
            <div className="rounded bg-success-soft px-1 text-success">
              +&nbsp;if (rateLimitExceeded) {"{"}
            </div>
            <div className="rounded bg-success-soft px-1 text-success">
              +&nbsp;&nbsp;&nbsp;throw new ApiError(429,
              &quot;RATE_LIMITED&quot;);
            </div>
            <div className="rounded bg-success-soft px-1 text-success">
              +&nbsp;{"}"}
            </div>
          </pre>
        </div>

        <div className="p-4 lg:col-span-7">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <span className="font-mono text-xs font-semibold text-success">
              Watchdocs updated 3 files
            </span>

            <div className="flex items-center gap-1">
              {files.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded px-2.5 py-1 font-mono text-xs transition-colors ${
                    activeTab === tab
                      ? "bg-ink font-medium text-paper"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "quickstart.md" && (
            <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-ink">
              <div className="select-none text-muted">
                # quickstart.md: example request
              </div>
              <div className="text-muted">&nbsp;&nbsp;POST /api/v1/swap</div>
              <div>&nbsp;&nbsp;{"{"}</div>
              <div>
                &nbsp;&nbsp;&nbsp;&nbsp;&quot;tokenIn&quot;:
                &quot;0xUSDC...&quot;,
              </div>
              <div>
                &nbsp;&nbsp;&nbsp;&nbsp;&quot;tokenOut&quot;:
                &quot;0xWETH...&quot;,
              </div>
              <div>
                &nbsp;&nbsp;&nbsp;&nbsp;&quot;amount&quot;: &quot;1000000&quot;,
              </div>
              <div className="rounded bg-success-soft px-1 text-success">
                +&nbsp;&nbsp;&nbsp;&quot;slippageBps&quot;: 50 // optional: max
                500 (0.5%)
              </div>
              <div>&nbsp;&nbsp;{"}"}</div>
            </pre>
          )}

          {activeTab === "errors.md" && (
            <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-ink">
              <div className="select-none text-muted">
                # errors.md: common status codes
              </div>
              <div>&nbsp;&nbsp;| Code | Name | Description |</div>
              <div>
                &nbsp;&nbsp;| 400 | BAD_REQUEST | Missing mandatory swap params
                |
              </div>
              <div>
                &nbsp;&nbsp;| 401 | UNAUTHORIZED | Invalid or expired API key |
              </div>
              <div className="rounded bg-success-soft px-1 text-success">
                +&nbsp;| 429 | RATE_LIMITED | Limit is 60 req/min. Includes
                Retry-After |
              </div>
            </pre>
          )}

          {activeTab === "llms.txt" && (
            <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-ink">
              <div className="select-none text-muted">
                # llms.txt: condensed API facts
              </div>
              <div>&nbsp;&nbsp;## POST /swap</div>
              <div>
                &nbsp;&nbsp;- tokenIn (string, required): input token address
              </div>
              <div>
                &nbsp;&nbsp;- tokenOut (string, required): output token address
              </div>
              <div>
                &nbsp;&nbsp;- amount (string, required): raw atomic units
              </div>
              <div className="rounded bg-success-soft px-1 text-success">
                +&nbsp;- slippageBps (integer, optional): max allowed slippage
                in BPS.
              </div>
              <div className="rounded bg-success-soft px-1 text-success">
                +&nbsp;- Errors: catch 429 and respect Retry-After.
              </div>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
