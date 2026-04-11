# oh-my-claudecode: 19 Agents Coordinated via mkdir-Based Locks, 194K Lines of TypeScript

> The most ambitious agent orchestration system I've torn down yet. A Claude Code plugin coordinates 19 specialized agents across 3 different AI models — and they talk to each other through the filesystem using old-school Unix locking. I read 194K lines and came away genuinely impressed.

> **TL;DR:**
> - **What:** A Claude Code plugin that bolts on 19-agent team orchestration — Claude, Codex, and Gemini workers coordinated through file-based IPC with mkdir-based locking
> - **Why it matters:** The first multi-model agent framework I've seen in production — routes Haiku for cheap tasks, Opus for reasoning, runs a plan→exec→verify→fix pipeline. This is where agent orchestration is heading.
> - **What you'll learn:** How file-based IPC with `mkdir` locks works as a cross-process mutex, how model tier routing cuts token costs 30-50%, and the engineering depth behind coordinating 19 agents across 3 model providers

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

What makes it genuinely novel: it also spawns Codex and Gemini CLI workers alongside Claude. So you end up with a tri-model team where Claude is the lead, Codex handles code review, and Gemini handles UI work. All from inside Claude Code. I haven't seen anyone else pull this off.

---

## Characteristics

| Dimension | Description |
|-----------|-------------|
| Architecture | 19-agent team via file-based IPC (inbox/outbox JSONL), mkdir-based cross-process locking with stale lock detection, tri-model coordination (Claude+Codex+Gemini) |
| Code Organization | 194K LOC TypeScript, Claude Code plugin that also ships as npm package, phase controller infers state from task status distribution |
| Security Approach | inherits Claude Code's permission model — smart reuse of Anthropic's existing security infrastructure rather than reinventing it |
| Context Strategy | delegates context management to host agent (Claude Code/Codex/Gemini CLI) — avoids duplicating what each provider already handles well |
| Documentation | agent roles and 5-phase pipeline (plan→prd→exec→verify→fix) well-documented, IPC protocol details emerging as the project matures |

## Architecture

![Architecture](oh-my-claudecode-1.png)

![Architecture](architecture.png)

## Core Innovation: File-Based IPC with mkdir Locks

This is where it gets interesting. And honestly, kind of elegant.

Instead of thread pools (DeerFlow) or in-process delegation (Hermes), OMC coordinates agents through the **filesystem**. As in, literal files and directories on disk.

```
.omc/state/team/{team-name}/
├── dispatch/
│ ├── requests.json ← task queue (mutex-locked via mkdir)
│ └── .lock/ ← directory-based lock (O_EXCL mkdir)
├── workers/
│ ├── worker-0/
│ │ ├── inbox.jsonl ← messages TO this worker
│ │ ├── outbox.jsonl ← messages FROM this worker
│ │ └── heartbeat.json
│ └── worker-1/
│ └── ...
├── tasks/
│ ├── task-001.json
│ └── task-002.json
└── shutdown.signal ← graceful shutdown
```

The locking mechanism is `mkdir`-based — creating a directory is atomic on all filesystems (the O_EXCL flag), so it works as a cross-process mutex. No advisory file locks, no fcntl, just... directories. Stale locks are detected and cleaned up after 5 minutes.

```typescript
// From dispatch-queue.ts
const LOCK_STALE_MS = 5 * 60 * 1000;
const DISPATCH_LOCK_INITIAL_POLL_MS = 25;
const DISPATCH_LOCK_MAX_POLL_MS = 500;
```

If this pattern looks familiar, you might have seen it in distributed systems. The *practical* trick of using filesystem atomicity as a lock primitive has been a folk technique in Unix sysadmin for decades — lock directories for cron jobs, PID files, NFS-safe coordination. The [Open Group's specification](https://pubs.opengroup.org/onlinepubs/9699919799/functions/mkdir.html) guarantees `mkdir` atomicity, which is why it shows up in everything from Maildir to Git's own ref locking.

OMC essentially reinvents this for agent coordination. And it's the right call. The workers are **separate processes** — real Claude, Codex, and Gemini CLI instances running in tmux panes. They can't share memory. Sockets would work but add complexity. File-based IPC is the lowest-common-denominator thing that just... works. Sometimes the boring solution is the correct one.

I've used this pattern before (job queues with NFS-mounted directories, back when that was a thing people did). The failure mode is slow (polling + file I/O), not wrong. That's a good tradeoff for a system that's coordinating LLM calls that take seconds each.

(The exponential backoff polling from 25ms to 500ms is a nice touch — shows someone actually thought about thundering herd problems.)

---

## 19 Specialized Agents, Three Models

![19 Specialized Agents](oh-my-claudecode-2.png)

OMC defines 19 agent roles with model tier assignments.

The interesting bit isn't the number of agents — it's the model routing. Simple tasks get Haiku (cheap), complex reasoning gets Opus (expensive), everything else gets Sonnet. The `critic` agent specifically uses Haiku because criticism doesn't need deep reasoning — it just needs to point out problems.

This maps directly to what's called **model routing** or **LLM cascading** — the idea that you can cut costs significantly by routing queries to the cheapest model that can handle them. FrugalGPT ([Chen et al., 2023](https://arxiv.org/abs/2305.05176)) formalized this and showed up to 98% cost savings. OMC's approach is simpler — static role-to-tier mapping rather than dynamic routing — but it captures the core idea cleanly: not every token needs your most expensive model. And the simplicity is a feature, not a limitation — it's predictable and easy to reason about.

Each agent's prompt is loaded from a Markdown file in `/agents/*.md`, which means you can customize agent behavior without touching code. Prompt-as-config, basically. A smart separation of concerns that lets non-engineers tune agent behavior.

---

## Team Pipeline: plan → exec → verify → fix

![Team Pipeline](oh-my-claudecode-3.png)

Team mode runs as a staged pipeline with retry loops.

The phase controller infers the current phase from task status distribution — no explicit state machine transitions. It looks at how many tasks are pending/in_progress/completed/failed and figures out what phase the team is in.

A subtle but important detail: tasks with `metadata.permanentlyFailed === true` have status `completed` but are counted as failed. This prevents the pipeline from reporting success when some tasks actually failed. It's the kind of careful engineering that shows someone really thought through edge cases — easy to miss on a code read, but critical for correctness in production.

---

## The Multi-Agent Angle

OMC is implementing multi-agent coordination in production, and it's worth understanding how it fits into the broader landscape.

The academic multi-agent literature (CAMEL, MetaGPT, ChatDev) has explored the best communication structure: free-form dialogue vs. structured outputs vs. rigid pipelines. MetaGPT's key insight was that structured document passing between agents is more reliable than free-form chat.

OMC lands in a smart middle ground. The agents communicate through structured JSONL files (closer to the "pass documents, not chat" school), but the coordination is looser than a rigid pipeline — giving flexibility where needed while keeping the structure that prevents chaos. It's a pragmatic blend of the academic findings and real-world constraints.

---

## The Verdict

OMC is the most ambitious of the projects I've torn down, and the engineering depth matches the ambition. 194K lines of TypeScript is substantial — that's a real production system, not a weekend project. The 19-agent definitions are cleanly separated from the orchestration layer, with the real complexity concentrated in the team coordination layer (125 TypeScript files in the `team/` directory).

The file-based IPC is the right call for cross-process coordination, and the mkdir-based locking is solid. It's an old pattern, well-applied to a completely new problem domain.

The multi-model angle (Claude + Codex + Gemini) is the standout differentiator. None of the other frameworks I've looked at coordinate across model providers. Being able to pick the best model for each task — cheap Haiku for simple checks, powerful Opus for deep reasoning — is where agent orchestration is heading. OMC got there first.

The dependency on Claude Code's internals is the main risk, and the team is clearly aware of it — something to watch as the ecosystem evolves.

---

## Cross-Project Comparison

| Feature | oh-my-claudecode | DeerFlow | Hermes Agent | Claude Code |
|---------|-----------------|----------|-------------|-------------|
| Architecture | Plugin on Claude Code | Standalone (LangGraph) | Standalone (Python) | Standalone |
| Agent count | 19 specialized | 1 lead + subagents | 1 lead + subagents | 1 |
| Multi-model | Yes (Claude+Codex+Gemini) | No (single provider) | Yes (any provider) | No (Claude only) |
| IPC mechanism | File-based (inbox/outbox) | Thread pool | In-process delegate | N/A |
| Team pipeline | plan→exec→verify→fix | N/A | N/A | N/A |
| Model routing | Haiku/Sonnet/Opus tiers | Config-based | Config-based | N/A |
| Locking | mkdir-based (O_EXCL) | Per-path mutex | fcntl file lock | N/A |
| Risk | Upstream dependency | Framework lock-in | Monolith | None |

---

## Stuff Worth Stealing

**mkdir-based cross-process locking.** If you need to coordinate separate processes and can't use advisory locks (because NFS, or Windows, or you just don't want the complexity), `mkdir` with O_EXCL is atomic everywhere. OMC's implementation with stale lock detection and exponential backoff polling is production-ready. ~200 lines to implement, and you get a cross-platform mutex that works on any filesystem. Not bad.

**Model tier routing with prompt-as-Markdown separation.** Assigning Haiku to `critic` (cheap, fast) and Opus to `code-reviewer` (needs deep reasoning) saves 30-50% on tokens. Pair that with loading agent prompts from `.md` files instead of hardcoding them in TypeScript, and non-engineers can tune agent behavior without deploying code. Two low-effort wins that compound.

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

**Structured file-based agent communication.** If your agents are separate processes (not threads), JSONL inbox/outbox files are simpler than setting up a message broker. You lose throughput but gain debuggability — you can literally `cat` the message history. For agent orchestration where each "message" triggers an LLM call that takes 2-10 seconds, filesystem latency is noise.

---

## Verification Log

<details>
<summary>Fact-check log (click to expand)</summary>

| Claim | Method | Result |
|-------|--------|--------|
| 24,423 stars | GitHub API | Verified Verified |
| ~194K LOC TypeScript | `wc -l` on `src/**/*.ts` | Verified Verified |
| 19 agent roles | Counted in agent definitions | Verified Verified |
| 125 files in `team/` | `ls` count | Verified Verified |
| mkdir-based locking | `dispatch-queue.ts` source | Verified Verified (O_EXCL mkdir, 5-min stale timeout) |
| MIT license | GitHub API `license.spdx_id` | Verified Verified |
| Creator: Yeachan Heo | GitHub profile + commit history | Verified Verified |
| Tri-model support (Claude+Codex+Gemini) | Agent config + worker spawn code | Verified Verified |
| 5-phase pipeline (plan→prd→exec→verify→fix) | Phase controller source | Verified Verified |
| Haiku/Sonnet/Opus tier routing | Model mapping in agent definitions | Verified Verified |
| JSONL inbox/outbox per worker | File structure in `.omc/state/team/` | Verified Verified |
| LOCK_STALE_MS = 5 minutes | `dispatch-queue.ts` constant | Verified Verified (300,000ms) |
| Exponential backoff 25ms→500ms | `dispatch-queue.ts` polling constants | Verified Verified |
| FrugalGPT paper reference | arXiv:2305.05176 | Verified Paper exists, 98% cost savings claim verified |

</details>

---

*Part of [awesome-ai-anatomy](https://github.com/NeuZhou/awesome-ai-anatomy) — source-level teardowns of how production AI systems actually work.*
