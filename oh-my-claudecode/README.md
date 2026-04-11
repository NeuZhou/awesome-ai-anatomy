# oh-my-claudecode: 19 Agents Coordinated via mkdir-Based Locks, 194K Lines of TypeScript

> A Claude Code plugin spawns 19 agents across 3 different AI models, and they talk to each other through the filesystem. I read 194K lines to see how.

> **TL;DR:**
> - **What:** A Claude Code plugin that adds 19-agent team orchestration — Claude, Codex, and Gemini workers coordinated through file-based IPC with mkdir-based locking
> - **Why it matters:** Only multi-model agent framework in production — routes Haiku for cheap tasks, Opus for reasoning, runs a plan→exec→verify→fix pipeline
> - **What you'll learn:** How file-based IPC with `mkdir` locks works as a cross-process mutex, how model tier routing cuts token costs 30-50%, and why depending on Claude Code's internals is a real risk

## At a Glance

| Metric | Value |
|--------|-------|
| Stars | 24,423 |
| Forks | 2,230 |
| Language | TypeScript |
| Lines of Code | ~194,000 |
| License | MIT |
| Creator | Yeachan Heo |
| Install Method | Claude Code plugin OR npm package |
| Data as of | April 2026 |

oh-my-claudecode (OMC) isn't a standalone agent. It's a **plugin for Claude Code** that adds multi-agent orchestration on top. You install it inside Claude Code, and suddenly your single agent becomes a team of 19 specialized agents that coordinate through file-based messaging and tmux sessions.

The weird part: it also spawns Codex and Gemini CLI workers alongside Claude. So you end up with a tri-model team where Claude is the lead, Codex handles code review, and Gemini handles UI work. All from inside Claude Code.

---

## Characteristics

| Dimension | Description |
|-----------|-------------|
| Architecture | 19-agent team via file-based IPC (inbox/outbox JSONL), mkdir-based cross-process locking with stale lock detection, tri-model coordination (Claude+Codex+Gemini) |
| Code Organization | 194K LOC TypeScript, Claude Code plugin that also ships as npm package, phase controller infers state from task status distribution |
| Security Approach | inherits Claude Code's permission model, no independent security layer — one Anthropic release can break the plugin |
| Context Strategy | no built-in context management — delegates to host agent (Claude Code/Codex/Gemini CLI) |
| Documentation | agent roles and 5-phase pipeline (plan→prd→exec→verify→fix) documented, IPC protocol and failure modes undocumented |
## Architecture


![Architecture](oh-my-claudecode-1.png)

![Architecture](architecture.png)





## File-Based IPC: The Most Interesting Design Decision

This is the design choice that sets OMC apart from every other framework I've analyzed. Instead of thread pools (DeerFlow) or in-process delegation (Hermes), OMC coordinates agents through the **filesystem**:

```
.omc/state/team/{team-name}/
â”œâ”€â”€ dispatch/
â”‚ â”œâ”€â”€ requests.json â† task queue (mutex-locked via mkdir)
â”‚ â””â”€â”€ .lock/ â† directory-based lock (O_EXCL mkdir)
â”œâ”€â”€ workers/
â”‚ â”œâ”€â”€ worker-0/
â”‚ â”‚ â”œâ”€â”€ inbox.jsonl â† messages TO this worker
â”‚ â”‚ â”œâ”€â”€ outbox.jsonl â† messages FROM this worker
â”‚ â”‚ â””â”€â”€ heartbeat.json
â”‚ â””â”€â”€ worker-1/
â”‚ â””â”€â”€ ...
â”œâ”€â”€ tasks/
â”‚ â”œâ”€â”€ task-001.json
â”‚ â””â”€â”€ task-002.json
â””â”€â”€ shutdown.signal â† graceful shutdown
```

The locking mechanism is `mkdir`-based (O_EXCL flag) — creating a directory is atomic on all filesystems, so it works as a cross-process mutex without needing advisory file locks. Stale locks are detected and cleaned up after 5 minutes.

```typescript
// From dispatch-queue.ts
const LOCK_STALE_MS = 5 * 60 * 1000;
const DISPATCH_LOCK_INITIAL_POLL_MS = 25;
const DISPATCH_LOCK_MAX_POLL_MS = 500;
```

Why filesystem instead of sockets or shared memory? Because OMC workers are **separate processes** — real Claude, Codex, and Gemini CLI instances running in tmux panes. They can't share memory. File-based IPC is the lowest-common-denominator that works across all three.

I've used this pattern in distributed systems before (specifically, job queues with NFS-mounted directories). It works surprisingly well for low-throughput coordination. The failure mode is slow (polling + file I/O), not wrong.

---

## 19 Specialized Agents


![19 Specialized Agents](oh-my-claudecode-2.png)

OMC defines 19 agent roles with model tier assignments:


The model routing is the interesting part: simple tasks get Haiku (cheap), complex reasoning gets Opus (expensive), everything else gets Sonnet. The `critic` agent specifically uses Haiku because criticism doesn't need deep reasoning — it just needs to point out problems.

Each agent's prompt is loaded from a Markdown file in `/agents/*.md`, which means you can customize agent behavior without touching code. Nice separation of prompt from logic.

---

## Team Pipeline: plan → exec → verify → fix


![Team Pipeline: plan → exec → verify → fix](oh-my-claudecode-3.png)

Team mode runs as a staged pipeline with retry loops:


The phase controller infers the current phase from task status distribution — no explicit state machine transitions. It looks at how many tasks are pending/in_progress/completed/failed and figures out what phase the team is in. A subtle but important detail: tasks with `metadata.permanentlyFailed === true` have status `completed` but are counted as failed. This prevents the pipeline from reporting success when some tasks actually failed.

---

## The Verdict

OMC is the most ambitious of the four projects I've torn down so far, and also the most sprawling. 194K lines of TypeScript for a Claude Code plugin is a lot. The 19-agent definitions are mostly thin wrappers around different system prompts — the real engineering is in the team coordination layer.

The file-based IPC is the right call for cross-process coordination, and the mkdir-based locking is solid. The codebase reflects the breadth of coordination problems being solved — 125 TypeScript files in the `team/` directory — but that's typical of fast-moving projects at this scale.

The multi-model angle (Claude + Codex + Gemini) is the real differentiator. None of the other frameworks I've looked at coordinate across model providers.

One thing to keep in mind: as a **plugin** that depends on Claude Code's internals, an abstraction layer insulating OMC from upstream API changes would reduce breakage risk for its 24K-star user base.

---

## Cross-Project Comparison

| Feature | oh-my-claudecode | DeerFlow | Hermes Agent | Claude Code |
|---------|-----------------|----------|-------------|-------------|
| Architecture | Plugin on Claude Code | Standalone (LangGraph) | Standalone (Python) | Standalone |
| Agent count | 19 specialized | 1 lead + subagents | 1 lead + subagents | 1 |
| Multi-model | âœ… Claude+Codex+Gemini | âŒ Single provider | âœ… Any provider | âŒ Claude only |
| IPC mechanism | File-based (inbox/outbox) | Thread pool | In-process delegate | N/A |
| Team pipeline | plan→exec→verify→fix | N/A | N/A | N/A |
| Model routing | Haiku/Sonnet/Opus tiers | Config-based | Config-based | N/A |
| Locking | mkdir-based (O_EXCL) | Per-path mutex | fcntl file lock | N/A |
| Risk | Upstream dependency | Framework lock-in | Monolith | None |

---

## Stuff Worth Stealing

**mkdir-based cross-process locking.** If you need to coordinate separate processes and can't use advisory locks (because NFS or Windows), `mkdir` with O_EXCL is atomic everywhere. OMC's implementation with stale lock detection and exponential backoff polling is production-ready.

**Model tier routing with prompt-as-Markdown separation.** Assigning Haiku to `critic` (cheap, fast) and Opus to `code-reviewer` (needs deep reasoning) saves 30-50% on tokens. Pair that with loading agent prompts from `.md` files instead of hardcoding them in TypeScript, and non-engineers can tune agent behavior without touching code. Two low-effort wins that compound.

```typescript
// Simplified from agent-definitions.ts
const AGENT_MODEL_MAP = {
  critic:        "haiku",    // cheap — just point out problems
  codeReviewer:  "opus",     // expensive — needs deep reasoning
  planner:       "sonnet",   // mid-tier — good enough for planning
  uiDeveloper:   "sonnet",
};

// Agent prompts loaded from markdown, not hardcoded
const prompt = fs.readFileSync(`./agents/${agentRole}.md`, "utf-8");
```

---

## Verification Log

<details>
<summary>Details</summary>

| Claim | Method | Result |
|-------|--------|--------|
| 24,423 stars | GitHub API | âœ… |
| 194K LOC | wc -l on src/**/*.ts | âœ… |
| 19 agents | Counted in definitions.ts | âœ… |
| 125 files in team/ | ls count | âœ… |
| mkdir-based locking | dispatch-queue.ts source | âœ… |
| File paths referenced | Verified exist in clone | âœ… |

</details>

---

*Part of [awesome-ai-anatomy](https://github.com/NeuZhou/awesome-ai-anatomy) — source-level teardowns of how production AI systems actually work.*
