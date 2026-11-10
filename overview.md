[ Git Push to Main ]
│
▼
[ GitHub Action: watchdocs.yml ]
│
├─► 1. Check author (Ignore if commit is by watchdocs[bot])
├─► 2. Filter: Did watched routes/schemas change?
│ └─► No ➔ Exit early (0 seconds wasted, 0 API tokens spent)
│ └─► Yes ➔ Continue
├─► 3. Extract exact git diff for route handlers
├─► 4. Read mapped doc files (quickstart.md, errors.md, llms.txt)
├─► 5. LLM Engine (Generates surgically updated Markdown)
└─► 6. Git & PR Engine:
├─► Create branch `watchdocs/sync-<short-sha>`
├─► Commit updated docs
└─► Open PR: "docs: sync for API changes in <commit>"

User on your website
│
▼
Clicks [Install GitHub App] ──► Selects their repo (e.g., `acme/swap-api`)
│
▼
A push happens on `acme/swap-api`
│
▼
GitHub sends a Webhook to your Watchdocs backend (Node/Express)
│
▼
Your server calls Gemini 1.5 Flash using your Master Key
│
▼
Your bot opens a PR on `acme/swap-api` using the GitHub App token
