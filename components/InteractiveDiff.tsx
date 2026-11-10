"use client";

import { useState } from "react";

type DocFile = "quickstart.md" | "errors.md" | "llms.txt";

export default function InteractiveDiff() {
  const [activeTab, setActiveTab] = useState<DocFile>("quickstart.md");

  return (
    <div className="border border-gh-border rounded-xl bg-gh-canvas overflow-hidden shadow-2xl">
      {/* Top Banner: Git Commit Trigger */}
      <div className="bg-gh-surface border-b border-gh-border px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">
            commit 4a8f9c1
          </span>
          <span className="text-zinc-200 font-medium">
            feat(api): add slippageBps parameter and rate limiting to /swap
          </span>
        </div>
        <span className="text-gh-muted font-mono">
          Triggered by git push to main
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-gh-border">
        {/* Left column: The code change that caused it */}
        <div className="lg:col-span-5 p-4 bg-[#070a10]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gh-border">
            <span className="text-xs font-mono font-semibold text-zinc-400">
              API ROUTE: src/routes/swap.ts
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              Source Diff
            </span>
          </div>

          <pre className="font-mono text-xs leading-relaxed overflow-x-auto text-zinc-300">
            <div className="text-zinc-400 select-none">
              @@ -14,6 +14,8 @@ export async function handleSwap()
            </div>
            <div>&nbsp;&nbsp;const schema = z.object({"{"}</div>
            <div>&nbsp;&nbsp;&nbsp;&nbsp;tokenIn: z.string(),</div>
            <div>&nbsp;&nbsp;&nbsp;&nbsp;tokenOut: z.string(),</div>
            <div>&nbsp;&nbsp;&nbsp;&nbsp;amount: z.string(),</div>
            <div className="bg-gh-diffAdd text-gh-diffAddText px-1 rounded">
              +&nbsp;&nbsp;&nbsp;slippageBps: z.number().max(500),
            </div>
            <div>&nbsp;&nbsp;{"}"});</div>
            <div>&nbsp;</div>
            <div className="text-zinc-400 select-none">@@ -42,3 +44,6 @@</div>
            <div className="bg-gh-diffAdd text-gh-diffAddText px-1 rounded">
              +&nbsp;if (rateLimitExceeded) {"{"}
            </div>
            <div className="bg-gh-diffAdd text-gh-diffAddText px-1 rounded">
              +&nbsp;&nbsp;&nbsp;throw new ApiError(429,
              &quot;RATE_LIMITED&quot;);
            </div>
            <div className="bg-gh-diffAdd text-gh-diffAddText px-1 rounded">
              +&nbsp;{"}"}
            </div>
          </pre>
        </div>

        {/* Right column: The markdown docs updated automatically */}
        <div className="lg:col-span-7 p-4 bg-gh-canvas">
          <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-gh-border gap-2">
            <span className="text-xs font-mono text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block"></span>
              Watchdocs Edited 3 Files:
            </span>

            {/* Doc File Tabs */}
            <div className="flex items-center gap-1">
              {(["quickstart.md", "errors.md", "llms.txt"] as DocFile[]).map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                      activeTab === tab
                        ? "bg-zinc-800 text-white font-medium border border-zinc-700"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {tab}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Tab 1: quickstart.md */}
          {activeTab === "quickstart.md" && (
            <pre className="font-mono text-xs leading-relaxed overflow-x-auto text-zinc-300">
              <div className="text-zinc-400 select-none">
                # quickstart.md: Example Request Body
              </div>
              <div className="text-gh-muted">&nbsp;&nbsp;POST /api/v1/swap</div>
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
              <div className="bg-gh-diffAdd text-gh-diffAddText px-1 rounded">
                +&nbsp;&nbsp;&nbsp;&quot;slippageBps&quot;: 50 // optional: max
                500 (0.5%)
              </div>
              <div>&nbsp;&nbsp;{"}"}</div>
            </pre>
          )}

          {/* Tab 2: errors.md */}
          {activeTab === "errors.md" && (
            <pre className="font-mono text-xs leading-relaxed overflow-x-auto text-zinc-300">
              <div className="text-zinc-400 select-none">
                # errors.md: Common Status Codes
              </div>
              <div>&nbsp;&nbsp;| Code | Name | Description |</div>
              <div>
                &nbsp;&nbsp;| 400 | BAD_REQUEST | Missing mandatory swap params
                |
              </div>
              <div>
                &nbsp;&nbsp;| 401 | UNAUTHORIZED | Invalid or expired API Key |
              </div>
              <div className="bg-gh-diffAdd text-gh-diffAddText px-1 rounded">
                +&nbsp;| 429 | RATE_LIMITED | Limit is 60 req/min. Includes
                Retry-After |
              </div>
            </pre>
          )}

          {/* Tab 3: llms.txt */}
          {activeTab === "llms.txt" && (
            <pre className="font-mono text-xs leading-relaxed overflow-x-auto text-zinc-300">
              <div className="text-zinc-400 select-none">
                # llms.txt: Condensed System Prompt for LLM Agents
              </div>
              <div>&nbsp;&nbsp;## POST /swap</div>
              <div>
                &nbsp;&nbsp;- tokenIn (string, required): Input ERC20 address
              </div>
              <div>
                &nbsp;&nbsp;- tokenOut (string, required): Output ERC20 address
              </div>
              <div>
                &nbsp;&nbsp;- amount (string, required): Raw atomic units
              </div>
              <div className="bg-gh-diffAdd text-gh-diffAddText px-1 rounded">
                +&nbsp;- slippageBps (integer, optional): Max allowed slippage
                in BPS.
              </div>
              <div className="bg-gh-diffAdd text-gh-diffAddText px-1 rounded">
                +&nbsp;- Error Handling: Catch 429 and respect Retry-After
                header.
              </div>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
