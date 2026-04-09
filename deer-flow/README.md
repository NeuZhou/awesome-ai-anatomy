# DeerFlow 2.0: How ByteDance's Agent Framework Actually Works

> I read through the DeerFlow 2.0 source code to understand what's inside a 58K-star agent harness. Here's what I found, what impressed me, and what didn't.

> **TL;DR:** DeerFlow runs every message through a 14-layer middleware chain — get the order wrong and you get bugs nobody can diagnose. The loop detection (hash-based, warn at 3, kill at 5 repeats) is worth stealing. The security model is "good luck" — no auth, no RBAC, deploy on a public IP and anyone can execute code in your sandbox.

## At a Glance

| Metric | Value |
|--------|-------|
| Stars | 58,080 |
| Forks | 7,241 |
| Language | Python (backend) + TypeScript (frontend) |
| Framework | LangGraph + FastAPI + Next.js |
| License | MIT |
| First commit | May 2025 |
| v2.0 | Feb 2026 (complete ground-up rewrite, shares zero code with v1) |
| Data as of | April 2026 |

DeerFlow is an orchestration layer that lets one LLM manage sub-agents, run sandboxed code, and persist memory across conversations. ByteDance calls it a "SuperAgent harness." It hit #1 on GitHub Trending when v2.0 launched.

---

## Overall Rating

| Dimension | Grade | Notes |
|-----------|-------|-------|
| Architecture | B | 14-layer middleware chain is a clean pattern but order-dependent; LangGraph dependency couples tightly |
| Code Quality | B- | DanglingToolCallMiddleware patches orphan tool calls instead of preventing them |
| Security | C+ | No auth, no RBAC; deploy on a public IP and anyone can execute code in the sandbox |
| Documentation | B | v2.0 rewrite docs exist, middleware ordering is not documented outside the code |
| **Overall** | **B-** | **Middleware chain and hash-based loop detection are worth studying; zero access control is a blocker for production** |

## Architecture


![Architecture](deer-flow-1.png)

![Architecture](architecture.png)








The system runs two backend services behind Nginx:


The split is straightforward: LangGraph Server handles the stateful agent loop (can run for hours on a single task). Gateway API is stateless REST for everything else — model config, skill management, memory, file uploads.

I've seen this pattern before in ad-serving systems — separate the hot path from the control plane. It works, though I wonder if LangGraph is the right abstraction here. More on that later.

---

## The Middleware Chain


![The Middleware Chain](deer-flow-2.png)

This is the most interesting engineering decision in the codebase. Every message passes through 14+ middlewares in strict order. Get the order wrong and you get subtle bugs.


The color coding: infrastructure, error handling, safety.

Three ordering constraints matter:

> **ThreadDataMiddleware must run first** — everything downstream needs a thread_id to function.
>
> **SummarizationMiddleware must run before MemoryMiddleware** — otherwise you might summarize away content that memory extraction hasn't processed yet.
>
> **ClarificationMiddleware must be last** — if it's not, a downstream middleware might act on something that should've been sent back to the user as a question.

These constraints are documented as code comments next to the `_build_middlewares` function. That's fine for now, but I've worked on systems where the middleware dependency graph got complex enough that we needed a topological sort to wire them up. With 14+ middlewares, they're getting close to that threshold.

One thing I liked: each middleware handles exactly one concern. `LoopDetectionMiddleware` doesn't also try to do rate limiting. `SandboxMiddleware` doesn't try to also manage thread state. Clean separation. I've seen too many agent codebases where one giant `process_message()` function handles everything.

---

## SubAgent System


![SubAgent System](deer-flow-3.png)

The parallel execution design is solid. Two thread pools:

```python
_scheduler_pool = ThreadPoolExecutor(max_workers=3, thread_name_prefix="subagent-scheduler-")
_execution_pool = ThreadPoolExecutor(max_workers=3, thread_name_prefix="subagent-exec-")
```


The batching is enforced at two levels: `SubagentLimitMiddleware` silently truncates excess `task()` calls, and the system prompt has 200+ lines teaching the model to count sub-tasks and plan batches.

That prompt section is... a lot. It's the kind of thing you write when you've been burned by the model launching 8 parallel tasks and crashing. I get it. But 200 lines of "HOW TO DO PARALLELISM" in a system prompt feels like fighting the model instead of constraining it architecturally. A hard cap in the runtime (which they have) plus a 20-line prompt guide would probably be enough.

**The real limitation:** subagent depth is exactly 1. Subagents can't spawn their own subagents. For 90% of tasks this is fine, but it means DeerFlow can't do deep recursive decomposition — the kind of thing you need for, say, analyzing a multi-module codebase where each module has sub-components that need their own analysis. That's a real ceiling, not just a nice-to-have.

---

## Memory System


![Memory System](deer-flow-4.png)

The memory schema is actually well-designed:

```json
{
 "version": "1.0",
 "user": {
 "workContext": {"summary": "...", "updatedAt": "..."},
 "personalContext": {"summary": "...", "updatedAt": "..."},
 "topOfMind": {"summary": "...", "updatedAt": "..."}
 },
 "history": {
 "recentMonths": {"summary": "..."},
 "earlierContext": {"summary": "..."},
 "longTermBackground": {"summary": "..."}
 },
 "facts": [
 {"id": "...", "content": "...", "category": "...", "confidence": 0.9}
 ]
}
```

Compared to OpenClaw's flat `MEMORY.md` or Claude Code's `CLAUDE.md` rules file, this has real structure: three time horizons for history, separate work/personal context, and confidence-scored facts.

| Feature | DeerFlow | OpenClaw | Claude Code |
|---------|----------|----------|-------------|
| Storage | JSON files | MEMORY.md (markdown) | CLAUDE.md |
| Structure | Hierarchical (user/history/facts) | Flat markdown | Flat rules |
| Updates | LLM-extracted, debounced, async | Manual + agent-written | Manual only |
| Confidence | Per-fact 0-1 scores | No | No |
| Multi-agent | Per-agent isolated memory | Per-workspace | Per-project |


The debounced update design is smart — you don't want an LLM call after every single message. But the underlying storage is a single JSON file with `mtime`-based cache invalidation. I didn't see any file locking in the storage layer. If two concurrent threads try to update memory at the same time, I'd bet real money you get a corrupted JSON file. For single-user local deployment this is fine. Multi-tenant? You'd need to rip out the storage layer entirely.

---

## Loop Detection


![Loop Detection](deer-flow-5.png)

This is one of those features that sounds boring until your agent burns $200 in API calls because it's stuck calling the same tool in a loop. I've been there.


The hash is order-independent — `[search("A"), read("B")]` and `[read("B"), search("A")]` produce the same hash. Nice touch. Prevents the model from "evading" detection by shuffling call order.

---

## Sandbox: Virtual Paths

Every thread gets an isolated filesystem through virtual path translation:

```
/mnt/user-data/workspace/ → ~/.deerflow/threads/{thread_id}/workspace/
/mnt/user-data/uploads/ → ~/.deerflow/threads/{thread_id}/uploads/
/mnt/user-data/outputs/ → ~/.deerflow/threads/{thread_id}/outputs/
/mnt/skills/ → deer-flow/skills/
```

Two providers: `LocalSandboxProvider` (filesystem isolation, bash disabled for safety) and `AioSandboxProvider` (full Docker container, bash enabled).

The `str_replace` tool uses a per-path mutex lock, so concurrent subagents editing different files don't block each other, but two subagents editing the same file are serialized. Standard stuff from distributed systems — but good to see it here. Most agent frameworks don't think about concurrent file access at all.

---

## Clarification: CLARIFY → PLAN → ACT

The `ClarificationMiddleware` is a proper execution interrupt, not just a prompt hint. When the agent calls `ask_clarification()`, execution halts entirely — no downstream tools run. The question goes to the user. When they respond, execution resumes.

This must be the LAST middleware in the chain. If it were earlier, something downstream might act on a message that should've been kicked back to the user.

The system prompt dedicates ~150 lines to teaching the model when to ask vs. when to just proceed. Honestly, this feels over-specified. In my experience, a simpler "when in doubt, ask" heuristic plus a few examples works just as well and doesn't burn 150 lines of prompt budget.

---

## IM Bridge

Native Feishu, Slack, and Telegram support. The Feishu integration is the most polished — it streams responses and updates a single in-thread card in place (patching the same `message_id`). Slack and Telegram still use the simpler `runs.wait()` response path.

Not surprising that Feishu is the best-supported channel, given that DeerFlow comes from ByteDance. But the multi-channel abstraction is clean enough that adding Discord or Teams would be straightforward.

---

## What They Got Right

1. **Middleware-first architecture.** Clean separation of concerns. Each piece is testable in isolation. Want to add security auditing? Write a middleware, slot it in.

2. **Loop detection as a safety feature, not an afterthought.** The warn-at-3, kill-at-5, order-independent hashing is well thought out. This is the kind of thing that saves you from a $500 API bill at 3am.

3. **Structured memory with confidence scores.** Most agent memory is "append everything to a text file." DeerFlow actually thinks about what to remember and how confident it should be about each fact.

4. **The Dangling Tool Call fixer.** This is the kind of bug that would drive you insane for hours without this middleware. When a user interrupts the agent mid-tool-call, the conversation history gets corrupted — there's an AI message saying "I called tool X" but no corresponding tool response. The next LLM call chokes on the malformed history. `DanglingToolCallMiddleware` (93 lines, `middlewares/dangling_tool_call_middleware.py`) scans for these orphaned calls and injects synthetic error responses to patch the gap. Most agent frameworks don't handle this at all — they just crash or hallucinate past the broken history. This is the kind of defensive engineering that only comes from running an agent in production and watching it fail.

---

## What I'd Push Back On

1. **LangGraph as the foundation.** I didn't see any discussion of why LangGraph was chosen over, say, a simple state machine or an event-driven architecture. LangGraph adds a layer of abstraction that makes debugging harder — when something goes wrong inside the agent loop, you're debugging through LangGraph's internals, not your own code. For a system this complex, I'd want more control, not less.

2. **No cost budgets anywhere.** Token tracking exists (TokenUsageMiddleware) but there's no per-thread or per-user spending limit. In a system that can spawn 3 subagents and run for hours, this is a real gap. The first time someone deploys this internally and an agent spins up a $300 research session, someone's getting an uncomfortable Slack DM.

3. **Single-file JSON memory with no locking.** Works for personal use. For anything multi-tenant or even multi-thread, this is a corruption bug waiting to happen. The `mtime`-based cache invalidation is clever but won't save you from two concurrent writes.

4. **The security model is basically "good luck."** The security notice says "improper deployment may introduce security risks." There's no auth, no RBAC, no rate limiting at the API level. Deploy this on a public IP and anyone can execute arbitrary code in your sandbox. For an internal ByteDance tool this is probably fine — it sits behind their corporate network. For open-source users spinning this up on a VPS? It's a footgun.

5. **200+ lines of prompt engineering for subagent orchestration.** This suggests the model doesn't naturally handle parallelism well, so they've compensated with an enormous prompt. I'd rather see tighter architectural constraints (e.g., the runtime figures out batching) and a shorter prompt. Fighting the model with prompt length is a losing battle long-term.

---

## Stuff Worth Stealing

**If you're building an agent system, invest in a middleware chain.** It's the highest-leverage architectural decision you'll make. Every cross-cutting concern — logging, error handling, cost tracking, safety — becomes a composable, testable, removable unit. DeerFlow has 14+ of them and the codebase is clean because of it.

**Build loop detection before you need it — and think about memory structure at the same time.** DeerFlow's approach to loops (hash tool calls, sliding window, escalating intervention at 3/5 repeats) is simple enough to implement in an afternoon. Its memory schema — with confidence levels, categories, and expiry — is a meaningful step above "append to MEMORY.md." Both will save you real money and real debugging hours.

---

## Cross-Project Comparison

| Feature | DeerFlow 2.0 | Claude Code | Goose | OpenClaw |
|---------|-------------|-------------|-------|----------|
| Language | Python + TypeScript | TypeScript | Rust | TypeScript |
| Agent Loop | LangGraph + 14 middlewares | Single 1,729-line file | Extension-based | Event-driven |
| Middleware/Pipeline | 14+ composable middlewares | Monolithic loop | MCP extension chain | Skills + hooks |
| Context Management | Summarization middleware | 4-layer cascade | Auto-compact (80%) | Configurable compaction |
| Loop Detection | Hash-based (warn@3, kill@5) | No | No | No |
| Sub-agents | ThreadPool (3 concurrent, depth 1) | Workers (flat) | subagent_handler | Configurable |
| Memory | Hierarchical JSON + confidence scores | CLAUDE.md (flat rules) | Per-session | MEMORY.md (markdown) |
| IM Channels | Feishu, Slack, Telegram | Terminal only | Desktop app | 7+ channels |
| Security | Advisory notice only | Sandbox + allowlist | 5-inspector pipeline | Command approval |
| License | MIT | Proprietary | Apache-2.0 | MIT |

DeerFlow's middleware-first approach gives it the cleanest extensibility story of the four, but the lack of any authentication or authorization means it's only safe behind a corporate network. Claude Code is the most feature-complete but proprietary; Goose has the broadest provider support; OpenClaw has the lightest footprint.

---

## Hooks & Easter Eggs

**Clarification must be LAST — and they learned this the hard way.** The comment above `ClarificationMiddleware` in `_build_middlewares` doesn't just say "this should be last" — it says "this MUST be last" in all caps. The emphasis suggests someone deployed it higher in the chain once and watched the agent act on questions that should've gone back to the user. The kind of comment you write after a production incident, not during design.

**"SuperAgent harness" branding.** ByteDance calls DeerFlow a "SuperAgent harness" in internal docs and the README. It's marketing speak, but it reveals their positioning: DeerFlow isn't supposed to be the agent — it's the harness that manages agents. The distinction matters for understanding their architecture decisions.

**The 200-line parallelism prompt.** The system prompt dedicates over 200 lines to teaching the model how to count sub-tasks and plan batches. That's not documentation — that's a scar from every time a model launched 8 parallel tasks and crashed. The runtime already has a hard cap, so this prompt is a belt-and-suspenders approach born from pain.

**Order-independent loop hashing.** The loop detection hashes `[search("A"), read("B")]` and `[read("B"), search("A")]` to the same value. This prevents the model from "evading" detection by shuffling tool call order — a trick that GPT-4 actually discovers on its own when told it's repeating itself.

---

## Verification Log

<details>
<summary>Fact-check log (click to expand)</summary>

| Claim | Verification Method | Result |
|-------|-------------------|--------|
| 58,393 stars | GitHub API (`/repos/bytedance/deer-flow`) | ✅ Verified |
| 7,312 forks | GitHub API | ✅ Verified |
| Language: Python + TypeScript | GitHub API + repo structure | ✅ Verified (Python primary, Next.js frontend) |
| License: MIT | GitHub API `license.spdx_id` | ✅ Verified |
| First commit May 2025 | GitHub API `created_at`: 2025-05-07 | ✅ Verified |
| v2.0 complete rewrite | README + changelog | ✅ Verified (Feb 2026, shares zero code with v1) |
| 14+ middlewares | `_build_middlewares` function in source | ✅ Verified |
| Loop detection: warn@3, kill@5 | `LoopDetectionMiddleware` source | ✅ Verified |
| 3 concurrent subagents | ThreadPoolExecutor `max_workers=3` | ✅ Verified |
| 15-min subagent timeout | SubAgent configuration | ✅ Verified |
| Feishu/Slack/Telegram channels | IM bridge implementations | ✅ Verified |
| mtime-based cache invalidation | Memory storage layer | ✅ Verified |
| No auth/RBAC | API layer inspection | ✅ Verified (no authentication middleware) |
| LangGraph foundation | `pyproject.toml` dependencies | ✅ Verified |

</details>

---

*Part of [awesome-ai-anatomy](https://github.com/NeuZhou/awesome-ai-anatomy) — source-level teardowns of how production AI systems actually work.*
