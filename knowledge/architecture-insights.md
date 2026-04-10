# Architecture Insights: Patterns & Anti-Patterns Across 15 AI Agent Projects

> Cross-cutting analysis of claude-code, cline, codex-cli, deer-flow, dify, goose, guardrails-ai, hermes-agent, lightpanda-browser, mempalace, mirofish, oh-my-claudecode, oh-my-codex, openhands, and pi-mono.

---

## 1. Architecture Taxonomy

After reading all 15 projects, five distinct architecture patterns emerge:

### Pattern Groups

| Pattern | Projects | Core Idea |
|---------|----------|-----------|
| **While-Loop Agent** | Claude Code, Cline, Hermes Agent, Pi Mono | Single `while(true)` or recursive loop: stream → tool call → execute → repeat. The model IS the scheduler. |
| **Queue-Pair / Event-Driven** | Codex CLI, OpenHands | Typed `Submission→Event` channels or event streams decouple the agent core from its frontends. The runtime is a message processor. |
| **Middleware Pipeline** | DeerFlow, Dify (graphon layers) | Every message passes through an ordered chain of composable middleware. Cross-cutting concerns (logging, safety, memory) are plug-and-play. |
| **MCP Extension Bus** | Goose | The agent loop is deliberately thin; all capabilities live in MCP extensions. The LLM is a scheduler dispatching to an extension ecosystem. |
| **Orchestration Layer** | oh-my-claudecode, oh-my-codex, MiroFish | Not a standalone agent — a coordination layer ON TOP of other agents. Multi-agent teams, file-based IPC, phase-gated pipelines. |

Two remaining projects occupy specialized niches:

| Niche | Projects | Role |
|-------|----------|------|
| **Validation Middleware** | Guardrails AI | Not an agent — a schema enforcement + reask layer that wraps LLM calls |
| **Infrastructure** | Lightpanda (headless browser), MemPalace (memory layer) | Tooling that agents *use*, not agent architectures themselves |

### Which Pattern Wins?

**The while-loop agent dominates — and that's fine.** Claude Code, Cline, Hermes, and Pi Mono all use some variant of "loop until no more tool calls." It wins because 90% of agent interactions are sequential: model speaks → tools execute → model speaks again. A state machine or event bus adds formality without adding clarity for this use case.

**But the middleware pipeline ages best.** DeerFlow's 14-middleware chain is the most extensible architecture in the dataset. Want to add cost tracking? Write a middleware. Want loop detection? Middleware. The composability means the core loop never grows — it stays thin while capabilities stack up around it. Dify's `graphon` layer system achieves something similar for workflow execution.

**The queue-pair (Codex CLI) is the right choice when you need multiple frontends.** CLI, desktop app, MCP server, cloud worker — all submitting to the same typed channel. If you're building one interface, it's overengineering. If you're building three, it pays for itself.

**So what?** If you're building a coding agent today, start with a while-loop. If you expect to add 5+ cross-cutting concerns (cost tracking, safety, logging, memory, loop detection), invest in a middleware chain from day one. If you need multiple frontends, use a queue-pair. Don't overthink it — Claude Code ships a trillion-dollar company's primary coding tool from a single `while(true)`.

---

## 2. The God Object Problem

**It's not a trend — it's nearly universal.** 10 of the 12 projects with an agent loop have a single enormous file at their center.

| Project | God Object | Lines | What It Does |
|---------|-----------|-------|--------------|
| **Cline** | `Task` class (`src/core/task/index.ts`) | 3,756 | Agent loop, streaming, context mgmt, hooks, checkpoints, tool execution, UI communication |
| **Codex CLI** | `codex.rs` | 7,786 | Session lifecycle, turn execution, compaction, sub-agents, tool dispatch |
| **Codex CLI** | `app.rs` (TUI) | 10,851 | Entire TUI event loop, rendering, state management |
| **Hermes Agent** | `run_agent.py` | 9,000+ | The entire agent loop in one class, one file |
| **Claude Code** | `query.ts` | 1,729 | Agent loop, API calls, streaming, tool dispatch, context management |
| **OpenHands** | `AgentController` | 1,391 | Agent loop, stuck detection, delegation, security checks |
| **Pi Mono** | `AgentSession` | 1,500+ | Model mgmt, compaction, retry, bash execution, extension lifecycle, session persistence |
| **Dify** | `dataset_retrieval.py` | 1,800 | RAG retrieval orchestration across 30+ vector DBs |
| **oh-my-claudecode** | Team coordination (~125 files in `team/`) | 194K total | Spread across many files, but the coordination logic is deeply intertwined |
| **MiroFish** | `report_agent.py` | 1,400 | Logging, data classes, prompts, ReACT loop, report management |

**The growth trajectory is telling:**
- Claude Code: 1,729 lines → the team acknowledges it needs splitting
- Cline: 3,756 lines → largest single-class agent loop in the survey
- Hermes: 9,000 lines → "load-bearing spaghetti" that nobody refactors at 26K stars
- Codex CLI: 7,786 + 10,851 → even their own AGENTS.md says "resist adding code to codex-core!"

**Only two projects avoid it:** DeerFlow (middleware chain keeps the core thin) and Goose (MCP extensions push logic to the edges). These are the projects where the architecture actively prevents accumulation.

**So what?** The God Object isn't laziness — it's gravity. Agent loops naturally accumulate concerns because every turn needs access to context, tools, permissions, and UI. The only cure is a structural pattern that forces separation (middleware, extensions, event bus). If you don't pick one, your agent loop WILL become a 3,000+ line monolith. It's not a question of if, but when.

---

## 3. Context Management Spectrum

This is where the most innovation is happening. Every project handles context differently, and the gap between the best and worst is enormous.

### The Spectrum

```
NO CONTEXT MGMT ←————————————————————————————→ SOPHISTICATED MULTI-STRATEGY

MiroFish          Guardrails    Pi Mono       DeerFlow       Goose          Codex CLI    Cline          Claude Code    OpenHands
MemPalace(agent)  oh-my-cc     Hermes        Dify                                                                     
Lightpanda        oh-my-codex                                                                                          
```

### Detailed Map

| Tier | Projects | Strategy | Token Cost of Wakeup |
|------|----------|----------|---------------------|
| **None** | MiroFish, Lightpanda, Guardrails AI | No conversation persistence between turns (or not applicable) | N/A |
| **Basic Truncation** | oh-my-claudecode, oh-my-codex | Relies on host agent (Claude Code / Codex CLI) for context management | Inherited |
| **Single Strategy** | Cline (truncation + optional auto-condense), DeerFlow (summarization middleware), Pi Mono (auto-compaction + overflow recovery) | One mechanism, triggered on threshold | Full history until trigger |
| **Multi-Strategy** | Hermes (5-step: prune→protect head→protect tail→summarize→iterate), Goose (threshold compact + background tool-pair summarization), Codex CLI (inline + remote compaction) | 2-3 coordinated mechanisms | Varies |
| **Cascade/Pipeline** | Claude Code (4-layer: HISTORY_SNIP→Microcompact→CONTEXT_COLLAPSE→Autocompact), OpenHands (10 condenser strategies composable in pipeline) | Progressive degradation, lossless-before-lossy | ~600 tokens (Claude Code L0+L1 equivalent) |

### Who's Doing It Best?

**OpenHands has the most sophisticated system** — 10 composable condensers including probabilistic forgetting (`AmortizedForgettingCondenser`), voluntary condensation (`CondensationRequestTool` where the agent asks to be condensed), and auditability (condensation events in the event stream). The pipeline combinator lets you chain strategies.

**Claude Code has the most production-proven system** — the 4-layer cascade (lossless deletion → cache-level hiding → structured archival → full compression) is battle-tested at scale. The principle "lossless before lossy, local before global" is the right design philosophy.

**MemPalace has the cleverest wakeup optimization** — the 4-layer memory stack (L0 identity ~100 tokens + L1 essential facts ~500 tokens, then on-demand retrieval) keeps session startup under 900 tokens. Most agents load full history.

**So what?** Context management is the #1 differentiator between a demo agent and a production agent. The projects that invested here (OpenHands, Claude Code) are the ones that work for multi-hour sessions. Start with "keep recent, summarize old" and evolve toward a cascade. And steal MemPalace's layered-loading idea — most sessions never need deep retrieval.

---

## 4. Security Posture Heat Map

| Project | Sandbox | Permission Model | Prompt Injection Defense | Network Control | Memory Safety | **Rating** |
|---------|---------|-----------------|------------------------|-----------------|---------------|-----------|
| **Codex CLI** | Native OS (Seatbelt/Landlock/RestrictedToken) — 17K LOC | Guardian AI auto-approval (risk scoring) | Hook-based pre_tool_use | Full MITM proxy with domain filtering | N/A | **A** |
| **OpenHands** | Docker containers | GraySwan + Invariant + LLM risk triple-stack | Policy engine rules | Container network isolation | N/A | **A-** |
| **Goose** | MCP process isolation | 5-inspector pipeline (Security+Egress+Adversary+Permission+Repetition) | Pattern + ML + LLM review chain | Env var blocklist (31 dangerous keys) | N/A | **B+** |
| **Claude Code** | macOS sandbox-exec only | Per-tool permission model + allowlist | Anti-distillation fake tools | None (trusts sandbox) | N/A | **B+** |
| **Cline** | None (in-process) | Human-in-the-loop polling (YOLO mode disables all) | Command permission controller (env var gated) | None | N/A | **B** |
| **Guardrails AI** | N/A | Validator-level (reask/fix/filter) | Content validators in Hub | N/A | N/A | **B** |
| **DeerFlow** | Local sandbox + Docker option | Advisory notice only | Clarification middleware | None | No auth/RBAC | **B-** |
| **Hermes Agent** | Subagent tool restrictions | Blocked tool frozenset | Memory threat pattern scanning | N/A | Memory write scanning | **B-** |
| **Pi Mono** | None built-in | Config-based approval | None | None | N/A | **B-** |
| **Dify** | Go-based code sandbox + SSRF proxy (Squid) | Multi-tenant workspace isolation | SSRF proxy for HTTP nodes | Squid proxy (all HTTP through it) | Plugin signature verification | **B** |
| **oh-my-codex** | Inherits Codex CLI sandbox | Inherits Codex CLI permissions | None own; relies on host | Inherits host | N/A | **B-** |
| **oh-my-claudecode** | Inherits Claude Code sandbox | Inherits Claude Code permissions | None own; relies on host | Inherits host | N/A | **B-** |
| **MiroFish** | None | None | None | None | N/A | **C** |
| **MemPalace** | None | MCP tool-level only | None | N/A | Shell injection in hooks (known issue #110) | **C+** |
| **Lightpanda** | Single-process (no isolation) | N/A (infrastructure) | N/A | N/A | Arena-based memory (prevents leaks, not attacks) | **B** (for its scope) |

### Industry Average: **B-**

Most projects treat security as an afterthought. Only three (Codex CLI, OpenHands, Goose) have a multi-layer security architecture. The median project has basic permission checking and no sandbox.

**Who's above average:** Codex CLI (A), OpenHands (A-), Goose (B+), Claude Code (B+), Dify (B)

**Who's below average:** MiroFish (C), MemPalace (C+), all orchestration layers that inherit from host

**So what?** The industry hasn't converged on a security pattern. Codex CLI bet on OS-native sandboxing (17K lines) and it's the gold standard. OpenHands bet on Docker isolation + a triple-analyzer stack. Goose bet on a pluggable inspection chain. All three work, but they're each 10K+ lines of security-specific code. If you're building an agent today, the minimum viable security is: (1) a sandbox for code execution, (2) human approval for writes, (3) some form of loop detection. Everything beyond that is differentiation.

---

## 5. The Fork vs Build Decision

| Project | Built From Scratch | Leveraged Framework | Key Dependency | Code Quality |
|---------|-------------------|-------------------|----------------|-------------|
| **Claude Code** |  Everything custom | — | Bun runtime only | **A-** |
| **Codex CLI** |  Everything custom (Rust) | — | Tokio, V8 (for JS sandbox) | **A** |
| **Goose** |  Custom core | MCP protocol (adopted, not built) | Tokio, Axum | **A** |
| **Pi Mono** |  Custom LLM layer, TUI, agent core | — | Node.js only | **B+** |
| **Lightpanda** |  Custom browser engine | html5ever (Servo parser via FFI) | V8, libcurl | **A** |
| **Cline** |  Custom core | VS Code Extension API | Puppeteer, 43 provider SDKs | **B-** |
| **OpenHands** |  Custom core | LiteLLM (provider abstraction) | Docker, FastAPI | **B+** |
| **Hermes Agent** |  Forked concepts from OpenClaw | — | Python stdlib | **B-** |
| **DeerFlow** |  Built on LangGraph | LangGraph (heavy dependency) | LangGraph, FastAPI | **B** |
| **Dify** | Partial — extracted graphon engine | Flask, Celery, ReactFlow | 30+ vector DB adapters | **B** |
| **oh-my-claudecode** |  Custom orchestration | Depends on Claude Code as host | tmux, filesystem IPC | **B** |
| **oh-my-codex** |  Custom orchestration | Depends on Codex CLI as host | tmux, git worktrees | **B+** |
| **MiroFish** |  Wraps OASIS (camel-ai) | OASIS simulation engine, Zep Cloud | Flask, OASIS | **B-** |
| **MemPalace** |  Custom (thin layer) | ChromaDB (vector store) | ChromaDB, SQLite | **B** |
| **Guardrails AI** |  Custom validation engine | LiteLLM (provider abstraction) | Pydantic v2, lxml | **B+** |

### Correlation Analysis

**From-scratch projects have higher code quality ratings.** The top 4 by code quality (Codex CLI A, Claude Code A-, Goose A, Lightpanda A) all built from scratch. The from-scratch average is ~B+ while the framework-dependent average is ~B-.

**But correlation ≠ causation.** The from-scratch projects are also backed by well-resourced teams (Anthropic, OpenAI, Block/AAIF, Lightpanda GmbH). The real insight:

**Framework dependency creates a ceiling.** DeerFlow is coupled to LangGraph — when debugging agent failures, you debug through LangGraph's internals, not your own code. MiroFish is coupled to OASIS — the "core engine" isn't theirs. Hermes inherited OpenClaw's architecture and its structural debt (9K-line god object). In each case, the framework provided fast initial velocity but capped architectural freedom.

**The exception:** Dify extracted its graph engine into `graphon` (standalone PyPI package). That's the right move — use a framework to bootstrap, then extract the core into your own abstraction when you understand the domain well enough.

**So what?** Build from scratch if you have the team and time — you'll end up with better architecture. If you use a framework, plan your extraction strategy from day one. The worst outcome is being 2 years into a LangGraph project when LangGraph makes a breaking change.

---

## 6. Takeaway Insights

Seven non-obvious conclusions from comparing all 15 projects:

### 1. "Context management is the real product, everything else is plumbing."

Claude Code's 4-layer cascade, OpenHands' 10-condenser pipeline, MemPalace's layered loading — the projects that invested the most engineering in context management are the ones that work for real tasks. Meanwhile, projects with sophisticated agent orchestration but naive context management (MiroFish, oh-my-claudecode) hit walls on anything longer than a 20-minute session. **If you're allocating engineering effort on a new agent, spend 40% on context management.**

### 2. "The God Object isn't a bug — it's the default evolutionary endpoint of every agent loop."

10 of 12 projects with agent loops have a 1,400-9,000 line monolith at the center. This isn't bad engineering; it's architectural gravity. Agent loops naturally absorb concerns because every turn needs access to everything. The only projects that avoided it (DeerFlow, Goose) used structural patterns (middleware, MCP extensions) that physically prevent accumulation. **If you don't pick an architecture that resists the God Object, you will grow one. Period.**

### 3. "Security is a 10K-line commitment, not a feature flag."

The three projects with real security (Codex CLI: 17K sandbox + 8K proxy, OpenHands: Docker + triple analyzer, Goose: 5-inspector pipeline) each invested 10,000+ lines in security-specific code. The remaining projects have permission dialogs at best. There's no middle ground — either you commit to a multi-layer security architecture or you ship a "click OK to approve" box that users will auto-approve after the third prompt. **Budget 10K lines for security or accept that you don't have any.**

### 4. "Multi-agent orchestration is a solution looking for a problem — except for parallel file editing."

oh-my-claudecode (19 agents), oh-my-codex (30 agents), DeerFlow (subagent pool), and Hermes (delegated tasks) all invest heavily in multi-agent coordination. But none demonstrated that 19 agents produce better results than 1 agent with good context management. The one case where multi-agent clearly wins: **parallel file editing across isolated git worktrees** (oh-my-codex). Everything else — planning agents, review agents, critic agents — could be sequential tool calls from a single agent. **Don't build a multi-agent system unless you have a parallelism problem, not a capability problem.**

### 5. "The middleware pattern is the most underused architecture in AI agents."

DeerFlow's 14-middleware chain is the cleanest codebase in the dataset, and it's one of only two projects that avoided the God Object. Dify's `graphon` layers achieve similar composability. Yet only 2 of 15 projects use this pattern. Everyone else either crams everything into the loop (Claude Code, Cline, Hermes) or pushes everything to extensions (Goose). **A middleware chain is the highest-leverage architectural decision for an agent framework. It costs ~500 lines to implement and saves you from a 5,000-line monolith.**

### 6. "Rust vs TypeScript is a false choice — the real question is 'do you need native OS sandboxing?'"

Codex CLI (Rust, 549K LOC) and Claude Code (TypeScript, 510K LOC) deliver comparable agent functionality. The difference: Codex CLI's Rust lets it call `seccomp(2)`, `landlock_add_rule(2)`, and Windows ACL APIs directly for sandboxing. Claude Code shells out to `sandbox-exec`. **Choose Rust if sandbox-as-code is your differentiator. Choose TypeScript if iteration speed matters more. The language doesn't determine agent quality — it determines what kind of security you can build.**

### 7. "The projects that will win in 2 years are the ones with clean package boundaries today."

Pi Mono (7 npm packages with strict dependency flow), Codex CLI (88 Cargo crates), and Goose (clean crate boundaries) all have architectures where you can understand one module without reading the rest. Cline (560K LOC, 3,756-line god class), Hermes (9K-line single file), and oh-my-claudecode (194K LOC plugin) have architectures where touching anything requires understanding everything. **Growth in features is multiplicative with architectural clarity. The clean-boundary projects will ship features faster in year 2 than the monolith projects ship in year 1.**

---

*Generated from source-level analysis of 15 projects totaling ~3.8M lines of code across TypeScript, Rust, Python, Zig, and Vue.js.*
*Part of [awesome-ai-anatomy](https://github.com/NeuZhou/awesome-ai-anatomy).*
