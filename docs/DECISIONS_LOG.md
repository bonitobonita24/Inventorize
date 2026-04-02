# Decisions Log — Spec-Driven Platform V26
# Format: ## YYYY-MM-DD — [Decision title]
# Types: 🟤 decision | ⚖️ trade-off
# Never re-ask anything listed here. These are locked decisions.
# ---

## Dev Environment Mode
- Type:      🟤 decision
- Date:      2026-04-02
- Decision:  MODE A — WSL2 native (the only supported mode as of V25)
- Rationale: Devcontainer adds 4 virtualisation layers on WSL2 + Docker Desktop causing
             permission errors, shell server crashes, and socket failures. WSL2 native eliminates all of this.
             Docker Desktop provides the Docker socket to WSL2 natively. No DinD needed.
- Locked:    yes — do not re-ask or scaffold devcontainer files.

---

## Git Branching Strategy
- Type:      🟤 decision
- Date:      2026-04-02
- Decision:  feat/{slug}, scaffold/part-{N}, squash-merge
- Rationale: Phase 4 uses part-by-part execution (Rule 24). Each Part gets its own branch.
             Feature branches use feat/{slug}. Never commit directly to main.
- Locked:    yes — follows Rule 23

---

## Model Routing
- Type:      🟤 decision
- Date:      2026-04-02
- Decision:  Planning/execution/governance model assignments
- Rationale: Planning: claude-code (Phase 2) or minimax-m2.5 (Cline)
             Execution: minimax-m2.5 (default — free tier, Cline via OpenRouter)
             Governance: gemini-2.5-flash-lite (cheapest, non-critical writes)
- Locked:    yes — follows Rule 24
