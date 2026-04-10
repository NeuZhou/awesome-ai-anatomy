# Cross-Cutting Analysis: 10 AI Agent Architectures Compared

> A horizontal comparison of architecture patterns, context management, tool systems, security postures, and technology choices across 10 dissected AI projects — with evidence drawn from source-level teardowns.

---

## Table of Contents

- [1. Architecture Patterns](#1-architecture-patterns)
- [2. Context Management Strategies](#2-context-management-strategies)
- [3. Tool System Design](#3-tool-system-design)
- [4. Security Posture](#4-security-posture)
- [5. Technology Choices](#5-technology-choices)
- [6. Anti-Pattern Catalog](#6-anti-pattern-catalog)
- [7. If You Were Building an AI Agent from Scratch Today](#7-if-you-were-building-an-ai-agent-from-scratch-today)

---

## 1. Architecture Patterns

Every agent needs an execution loop. The differences in how these 10 projects structure that loop determine their extensibility ceiling, debuggability, and failure modes.

### Core Loop Taxonomy

| Project | Loop Pattern | Loop Location | Max LOC in Single File | Multi-Agent | Agent Depth |
|---------|-------------|---------------|----------------------|-------------|-------------|
| **Claude Code** | While-loop | `query.ts` (1,729 lines) | 1,729 | Yes (workers, flat) | 1 |
| **Dify** | Graph-based DAG | `graphon` engine + `workflow_entry.py` | ~1,800 (`dataset_retrieval.py`) | Yes (child engines) | 5 (`WORKFLOW_CALL_MAX_DEPTH`) |
| **DeerFlow** | Middleware chain (LangGraph) | 14+ middleware files | ~200 lines per middleware | Yes (ThreadPool) | 1 |
| **MiroFish** | Pipeline (sequential stages) | `simulation_runner.py` (700+ lines) | 1,400 (`report_agent.py`) | Yes (OASIS multi-agent sim) | 0 (no sub-agents) |
| **Goose** | While-loop | `agent.rs` (900+ lines) | ~2,300 (`extension_manager.rs`) | Yes (subagent_handler) | Configurable |
| **Guardrails AI** | Reask loop | `runner.py` (457 lines) | 1,076 (`guard.py`) | No | N/A |
| **oh-my-claudecode** | Phase-based pipeline | Phase controller + dispatch queue | 194K total across team/ | Yes (19 agents, file IPC) | 1 (workers can't nest) |
| **Pi Mono** | While-loop (game-loop style) | `agent.ts` + `agent-session.ts` | 1,500+ (`agent-session.ts`) | No | 0 |
| **Hermes Agent** | While-loop | `run_agent.py` (9,000+ lines) | 9,000+ | Yes (delegate tool) | 1 (blocked by tool restriction) |
| **Lightpanda** | Event-driven (CDP dispatch) | `Page.zig` (3,660 lines) | 3,660 | N/A (browser, not agent) | N/A |

### Pattern Distribution

| Pattern | Projects | Count |
|---------|----------|-------|
| **While-loop** | Claude Code, Goose, Pi Mono, Hermes Agent | 4 |
| **Graph-based / DAG** | Dify | 1 |
| **Middleware chain** | DeerFlow | 1 |
| **Sequential pipeline** | MiroFish, oh-my-claudecode | 2 |
| **Reask loop** (validation-specific) | Guardrails AI | 1 |
| **Event-driven** | Lightpanda | 1 |

### Analysis

**The while-loop dominates for a reason.** Claude Code, Goose, Pi Mono, and Hermes all use a simple `while(true)` / `loop` structure. The agent loop is fundamentally sequential — model speaks → tools execute → model speaks again. A while-loop expresses this naturally. The cost is concentration of logic: Claude Code's `query.ts` (1,729 lines), Hermes's `run_agent.py` (9,000+ lines), and Pi's `agent-session.ts` (1,500+ lines) are all "god files" born from this pattern.

**Graph-based is the enterprise choice.** Dify's `graphon` engine runs DAGs with middleware layers, child engine spawning, and execution limits. This is the most formally correct approach — explicit state, testable transitions, composable layers — but it requires the most infrastructure (7+ Docker containers).

**Middleware chains offer the best extensibility-to-complexity ratio.** DeerFlow's 14-middleware chain keeps each concern isolated and testable. Adding a new cross-cutting feature (loop detection, cost tracking) is a new middleware, not a modification to the god file. The downside: ordering constraints are implicit and fragile (evidence: DeerFlow's `ClarificationMiddleware` MUST be last, learned "the hard way" per code comments).

**Phase-based pipelines suit orchestration.** oh-my-claudecode's plan→exec→verify→fix pipeline is purpose-built for multi-agent coordination. The phase controller infers state from task status distribution rather than explicit transitions — pragmatic but less predictable.

---

## 2. Context Management Strategies

Context window management is the single most important engineering challenge in production agent systems. Every project handles it differently.

### Strategy Comparison

| Project | Strategy | Layers | Trigger | Lossless Steps | Lossy Steps | Innovation |
|---------|----------|--------|---------|----------------|-------------|------------|
| **Claude Code** | 4-layer cascade | 4 | Progressive (lightest first) | L1: Surgical deletion, L2: Cache-level hiding | L3: Structured archival, L4: Full compression | Most sophisticated; lossless-before-lossy principle |
| **Dify** | Execution limits + layer middleware | 2 | Configurable (steps/time) | N/A (workflow engine, not conversation) | N/A | `ExecutionLimitsLayer` caps at 500 steps / 1200s |
| **DeerFlow** | Summarization middleware | 1 | Near context limit | None | Full summarization | `SummarizationMiddleware` in the chain |
| **MiroFish** | None | 0 | N/A | N/A | N/A | Relies on OASIS engine's internal limits |
| **Goose** | Auto-compact + tool-pair summarization | 2 | Threshold (80% of window) | Tool-pair summarization (background) | Full compaction (LLM summary) | Concurrent background summarization |
| **Guardrails AI** | None (stateless validation) | 0 | N/A | N/A | N/A | Not applicable — single-turn validation |
| **oh-my-claudecode** | Inherited from Claude Code | 4 | Same as Claude Code | Same | Same | No additional innovation |
| **Pi Mono** | Auto-compaction + overflow recovery | 2 | Threshold + error recovery | None | LLM compaction | Extension-overridable via `session_before_compact` |
| **Hermes Agent** | 5-step structured compression | 5 | Near context limit | Step 1: Prune tool results | Steps 2-5: Head protection, tail preservation, middle summarization, iterative refinement | Structured summary template (Goal/Progress/Decisions/Files/Next) |
| **Lightpanda** | Arena lifetime scoping | N/A | Navigation events | Full arena reset per page | N/A | Memory freed per-page, not per-conversation |

### Context Management Maturity Ranking

| Rank | Project | Sophistication | Evidence |
|------|---------|----------------|----------|
| 1 | **Claude Code** | Most sophisticated | 4-layer cascade: HISTORY_SNIP, Microcompact, CONTEXT_COLLAPSE, Autocompact. Lossless before lossy. |
| 2 | **Hermes Agent** | Very strong | 5-step pipeline with structured summaries. Head/tail protection + iterative refinement. |
| 3 | **Goose** | Very strong | Proactive 80% threshold + concurrent tool-pair summarization. Recovery path for overflow errors. |
| 4 | **Pi Mono** | Moderate | Auto-compaction with overflow recovery. Extension-overridable -- the only project that lets plugins customize compaction. |
| 5 | **DeerFlow** | Basic | Single summarization middleware. No progressive degradation. |
| 6 | **Dify** | Basic | Execution limits prevent runaway, but no conversation-level context management. |
| 7 | **oh-my-claudecode** | Basic | Inherits from Claude Code but adds nothing. |
| 8-10 | **MiroFish, Guardrails, Lightpanda** | N/A | Not applicable to their problem domains. |

### Key Insight

**The "forgetting problem" is asymmetric.** Claude Code's L3/L4 compression and Hermes's middle-summarization both have the same hidden flaw: after compression, the model doesn't know what it forgot. It can't flag "I may be missing context here." This produces confident wrong answers, which are worse than uncertainty. Goose's tool-pair summarization partially addresses this by summarizing proactively (before overflow), preserving the most recent context fully intact.

**Hermes's "frozen snapshot" trick is underappreciated.** By freezing MEMORY.md at session start, MEMORY remains stable in the system prompt across the entire session. This preserves the provider's prompt cache — if your provider charges per prompt token, this saves real money on long sessions. No other project does this.

---

## 3. Tool System Design

How tools are defined, registered, discovered, and executed varies dramatically across the 10 projects.

### Tool Architecture Taxonomy

| Project | Pattern | Tool Count | Tool Definition | Registration | Parallel Execution | Namespace |
|---------|---------|-----------|----------------|-------------|-------------------|-----------|
| **Claude Code** | Functional composition (`buildTool()`) | 40+ | Schema + permissions + execution + UI rendering in one object | Static (`buildTool()` at startup) | Yes (RWLock: reads parallel, writes exclusive) | Flat |
| **Dify** | Node factory (graph nodes) | 15+ node types | Node class + config in factory dict | Factory pattern (`DifyNodeFactory`) | Via graph engine (parallel branches) | Graph-scoped |
| **DeerFlow** | LangGraph tools + MCP | Varies | LangGraph `StructuredTool` | LangGraph integration | Via ThreadPool (3 max) | Middleware-scoped |
| **MiroFish** | ReACT tool calls | 5 built-in | Function definitions for Zep/simulation tools | Hardcoded in ReportAgent | No | Flat |
| **Goose** | MCP-native extensions (6 flavors) | 50+ (across extensions) | `ToolDefinition` via MCP protocol | Dynamic (`ExtensionManager`) | Yes (approved tools in parallel) | Prefixed (`ext__tool`) |
| **Guardrails AI** | Validator Hub (pip packages) | Hub ecosystem (N packages) | `Validator` base class + `OnFailAction` | `guardrails.install("hub://...")` | Async by default | JSON path |
| **oh-my-claudecode** | Inherited + team dispatch tools | 40+ (Claude Code) + team tools | Same as Claude Code + file-based IPC | Plugin injection | Via tmux panes (process-level parallelism) | Flat |
| **Pi Mono** | Extension-based (`ToolDefinition`) | 20+ built-in | Schema + execute + TUI `renderCall`/`renderResult` | Dynamic (`registerTool()`) | No (sequential within turn) | Flat |
| **Hermes Agent** | Tool registry | 40+ | Function definitions + metadata | Registry pattern | Via delegate tool (3 max concurrent) | Flat |
| **Lightpanda** | CDP protocol domains | 15 domains | Zig struct with `processMessage()` handler | Comptime (compile-time registration) | Single-threaded | Domain-prefixed |

### Design Philosophy Comparison

| Philosophy | Projects | Pros | Cons |
|------------|----------|------|------|
| **Functional composition** (no classes) | Claude Code, Pi Mono | No inheritance traps, co-located concerns, trivially testable | Boilerplate at scale (100+ tools) |
| **Class-based inheritance** | Guardrails AI (`Validator` base class) | Shared validation pipeline, consistent interface | Fragile base class problem, harder to test |
| **Plugin/Extension (MCP)** | Goose, DeerFlow | Maximum extensibility, ecosystem-compatible, process isolation | Latency per call, MCP protocol overhead |
| **Node/Graph** | Dify | Visual composition, branch parallelism | Heavy factory pattern, complex wiring |
| **Hardcoded** | MiroFish | Simple, no abstraction overhead | Zero extensibility |

### Notable Innovations

- **Claude Code's RWLock for tools**: Read-only tools execute in parallel during streaming. Write tools get exclusive locks. Simple RWLock pattern applied to tool dispatch — few other projects do this.
- **Goose's 6 extension flavors**: Platform (in-process with agent context), Builtin (in-process MCP via DuplexStream), Stdio (child process), StreamableHTTP (remote), Frontend (desktop-only), InlinePython. Single `McpClientTrait` interface unifies all.
- **Pi Mono's TUI-integrated tools**: Each tool has `renderCall()` and `renderResult()` methods that produce TUI components. The tool owns its visual representation — no separation of tool execution from tool display.
- **Guardrails AI's `OnFailAction` enum**: 8 strategies for handling validation failures — `reask`, `fix`, `filter`, `refrain`, `noop`, `exception`, `fix_reask`, `custom`. Comprehensive error-handling taxonomy.
- **Goose's env var blocklist**: 31 known-dangerous environment variables blocked for extensions (LD_PRELOAD, DYLD_INSERT_LIBRARIES, APPINIT_DLLS, etc.) — prevents DLL injection and library preloading through extension configs.

---

## 4. Security Posture

Security posture varies wildly. Some projects treat security as a core concern; others treat it as an afterthought.

### Security Evaluation Matrix

| Dimension | Claude Code | Dify | DeerFlow | MiroFish | Goose | Guardrails AI | OMC | Pi Mono | Hermes | Lightpanda |
|-----------|------------|------|----------|----------|-------|--------------|-----|---------|--------|------------|
| **Input Validation** | Present (tool allowlist) | Present (SSRF proxy) | Absent | Absent | Thorough (5 inspectors) | Thorough (schema validation) | Basic (inherited) | Basic (hooks) | Present (memory scanning) | Present (CDP validation) |
| **Sandbox / Isolation** | Strong (seatbelt on macOS) | Strong (Docker + Go sandbox) | Basic (Docker optional) | Absent | Present (process isolation) | Basic (library mode) | Present (inherited sandbox) | Strong (arena-based) | Present (Docker) | Strong (arena memory) |
| **Auth / RBAC** | Present (permission model) | Thorough (multi-tenant workspaces) | Absent | Absent | Basic (permission inspector) | Present (API-level) | Basic (inherited) | Basic | Basic | N/A |
| **Prompt Injection Defense** | Basic (no dedicated scanning) | Basic (no dedicated scanning) | Absent | Absent | Thorough (AdversaryInspector) | Basic | Basic | Basic | Present (memory threat detection) | N/A |
| **Data Exfiltration Prevention** | Present (tool scoping) | Thorough (SSRF proxy + sandbox) | Absent | Absent | Thorough (EgressInspector) | Basic | Basic | Basic | Present | N/A |
| **Tool Execution Safety** | Thorough (per-tool permission + RWLock) | Present (sandbox + plugin verification) | Basic (advisory only) | Absent | Thorough (5-inspector pipeline) | Present (reask budget cap) | Present (inherited) | Basic | Present (subagent restrictions) | N/A |
| **Memory/State Protection** | Basic (unauditable compression) | Present (database-backed) | Absent | Absent | Basic | N/A | Basic | Basic | Present (threat scanning) | Thorough (arena lifetime) |
| **Overall** | **Solid defense with gaps in injection scanning** | **Solid infrastructure-level isolation** | **No security layer; advisory only** | **No security measures identified** | **Most thorough defense-in-depth** | **Focused on output validation, not agent security** | **Dependent on Claude Code host** | **Minimal independent security** | **Selective protection (memory-focused)** | **Strong memory safety, no process isolation** |

### Detailed Evidence

| Project | Key Security Features | Key Security Gaps |
|---------|----------------------|-------------------|
| **Claude Code** | macOS `sandbox-exec` for bash, tool allowlist, permission system | No prompt injection scanning; context compression is unauditable |
| **Dify** | SSRF proxy (Squid), plugin daemon process isolation, code sandbox (Go), plugin signature verification | Plugin signature bypass for third-party plugins |
| **DeerFlow** | "Advisory notice" only | No auth, no RBAC, no rate limiting. Deploy on public IP = anyone executes code in your sandbox |
| **MiroFish** | None identified | No input validation, no sandbox for simulation, OASIS handles everything |
| **Goose** | 5-inspector pipeline (Security + Egress + Adversary + Permission + Repetition), env var blocklist (31 keys) | AdversaryInspector LLM review adds latency |
| **Guardrails AI** | Streaming validation, DFS schema traversal, reask budget cap | Hub validators installed from git — dependency supply chain risk |
| **oh-my-claudecode** | Inherits Claude Code's sandbox, mkdir-based locking (atomic) | Plugin depends on Claude Code internals — fragile boundary |
| **Pi Mono** | Extension event hooks for interception | "Stealth mode" impersonates Claude Code — potential ToS violation |
| **Hermes Agent** | Memory threat scanning, skill security guard, delegate tool restrictions | 9K-line god file = hard to audit; no cost budgets |
| **Lightpanda** | Arena-based memory (no dangling refs within scope), `--obey-robots` | AGPL limits commercial use; Web API gaps may cause silent failures |

### Security Leader: Goose

Goose's 5-inspector pipeline is the gold standard in this group. Each inspector implements the `ToolInspector` trait and produces `Allow`, `RequireApproval`, or `Deny`. The `AdversaryInspector` can call the LLM itself to review suspicious tool calls before execution. The 31-key env var blocklist prevents DLL injection, library preloading, and runtime hijacking through extension configs. No other project comes close to this level of defense-in-depth.

### Security Laggard: DeerFlow

DeerFlow has no authentication, no RBAC, no rate limiting at the API level. The security notice literally says "improper deployment may introduce security risks." For an internal ByteDance tool behind a corporate network, this is acceptable. For open-source users running this on a VPS — it's a footgun.

---

## 5. Technology Choices

### Language & Framework Comparison

| Project | Primary Language | Secondary Language | Framework | Runtime | LOC (approx.) | License |
|---------|-----------------|-------------------|-----------|---------|---------------|---------|
| **Claude Code** | TypeScript | — | Bun, React/Ink, Zod v4 | Bun | ~510K | Proprietary |
| **Dify** | Python | TypeScript | Flask/Gunicorn, Celery, Next.js, ReactFlow | CPython | ~1,283K | Modified Apache 2.0 |
| **DeerFlow** | Python | TypeScript | LangGraph, FastAPI, Next.js | CPython | ~180K | MIT |
| **MiroFish** | Python | Vue.js (JS) | Flask, OASIS (camel-ai), Zep Cloud | CPython | ~39K | AGPL-3.0 |
| **Goose** | Rust | TypeScript | Tokio, Axum, Electron | Native | ~200K | Apache-2.0 |
| **Guardrails AI** | Python | — | Pydantic v2, LiteLLM, OpenTelemetry | CPython | ~18K | Apache-2.0 |
| **oh-my-claudecode** | TypeScript | — | Claude Code plugin API | Bun (via CC) | ~194K | MIT |
| **Pi Mono** | TypeScript | — | Node.js (pure), Lit (web components) | Node.js | ~147K | MIT |
| **Hermes Agent** | Python | — | Custom (no framework) | CPython | ~260K | MIT |
| **Lightpanda** | Zig | Rust (FFI) | V8, html5ever, libcurl, BoringSSL | Native (Zig) | ~91K | AGPL-3.0 |

### Language Distribution

| Language | Projects | Percentage |
|----------|----------|------------|
| **Python** | Dify, DeerFlow, MiroFish, Guardrails AI, Hermes Agent | 50% |
| **TypeScript** | Claude Code, oh-my-claudecode, Pi Mono | 30% |
| **Rust** | Goose | 10% |
| **Zig** | Lightpanda | 10% |

### Deployment Complexity

| Project | Min Containers | Env Vars | Setup Difficulty | Target User |
|---------|---------------|----------|-----------------|-------------|
| **Dify** | 7+ (API, Worker, Beat, Web, Redis, PG, Nginx, Sandbox, Plugin Daemon) | 400+ | High | Enterprise teams |
| **DeerFlow** | 2 (LangGraph Server, Gateway API) | ~50 | Medium | Developers |
| **MiroFish** | 1 (Flask) + external APIs (Zep, OASIS) | ~20 | Medium | Researchers |
| **Goose** | 1 binary | ~10 | Low | Individual developers |
| **Claude Code** | 1 binary (Bun) | ~5 | Low | Individual developers |
| **Guardrails AI** | 0 (pip install) | ~3 | Low | Any Python developer |
| **oh-my-claudecode** | 0 (plugin install) | ~5 | Low | Claude Code users |
| **Pi Mono** | 1 binary (npx) | ~5 | Low | Individual developers |
| **Hermes Agent** | 1 process | ~10 | Low | Individual developers |
| **Lightpanda** | 1 binary | ~3 | Low | Automation engineers |

### Provider Lock-in

| Project | Provider Lock-in | Evidence |
|---------|-----------------|----------|
| **Claude Code** | **Anthropic only** | Hard dependency on Claude API; no provider abstraction |
| **Dify** | **None** | Plugin marketplace for providers; 30+ vector DBs |
| **DeerFlow** | **Partial** | LangGraph supports multi-model but config-based |
| **MiroFish** | **Partial** | OpenAI-compatible API required; Zep Cloud dependency |
| **Goose** | **None** | 30+ providers; declarative JSON for new OpenAI-compatible providers |
| **Guardrails AI** | **None** | LiteLLM for model calls; any provider |
| **oh-my-claudecode** | **Partial** | Primary: Anthropic; secondary: Codex, Gemini |
| **Pi Mono** | **None** | 10+ native provider implementations; lazy-loading |
| **Hermes Agent** | **None** | Multi-provider support via configuration |
| **Lightpanda** | N/A | Browser, not LLM-dependent |

---

## 6. Anti-Pattern Catalog

Patterns observed multiple times across these 10 projects that represent avoidable engineering mistakes.

### Anti-Pattern 1: The God File

| Project | File | Line Count | What It Contains |
|---------|------|-----------|-----------------|
| **Hermes Agent** | `run_agent.py` | 9,000+ | Agent loop, tool dispatch, context management, provider calls, error handling, cron, memory — everything |
| **Claude Code** | `query.ts` | 1,729 | Input processing, API calls, streaming parsing, tool dispatch, error recovery, context management |
| **Lightpanda** | `Page.zig` | 3,660 | Navigation, script execution, DOM events, frame management, request coordination |
| **MiroFish** | `report_agent.py` | 1,400+ | Logging classes, data classes, prompt constants, ReACT loop, report management |
| **Pi Mono** | `agent-session.ts` | 1,500+ | Model management, compaction, retry, bash execution, extension lifecycle, session persistence |
| **Guardrails AI** | `guard.py` | 1,076 | Schema container, validator registry, LLM caller, API client, history store, telemetry manager, serializer |

**Impact:** Merge conflicts, implicit state coupling, untestable cross-cutting concerns, onboarding nightmare.

**Counter-evidence:** DeerFlow's middleware chain — 14+ files, ~200 lines each, one concern per file. Clean, testable, composable.

### Anti-Pattern 2: No Cost Budgets

| Project | Has Cost Tracking | Has Cost Limits | Risk |
|---------|-------------------|-----------------|------|
| **DeerFlow** | Yes (TokenUsageMiddleware) | No | Agent can run for hours uncapped |
| **Hermes Agent** | Partial (memory tracking) | No | Modal/Daytona integration without stop-at-$X = cloud bill surprise |
| **MiroFish** | No | No | Each agent per round = 1 LLM call x N agents x M rounds |
| **oh-my-claudecode** | No | No | 19 agents x 3 model tiers = cost multiplier |
| **Goose** | Yes (ProviderUsage per stream) | No | 1000-turn max but no dollar ceiling |

**Only Dify has execution limits** (500 steps, 1200 seconds) set at the infrastructure level. Every other project trusts the model to self-terminate, which is precisely the thing models are bad at.

### Anti-Pattern 3: Borrowed Core, No Ownership

| Project | What's Borrowed | From Whom | Risk |
|---------|----------------|-----------|------|
| **MiroFish** | OASIS simulation engine | camel-ai | Core capability depends on an external library; `builtins.open` monkey-patch needed for Windows compat because OASIS doesn't handle encoding |
| **DeerFlow** | LangGraph state machine | LangChain | Debugging agent loop requires understanding LangGraph internals |
| **oh-my-claudecode** | Entire host (Claude Code) | Anthropic | One Anthropic release can break everything |
| **Dify** | graphon engine | Dify-extracted PyPI package | Better — they extracted their own engine, but it's still tightly coupled |

**Pattern:** When your core loop depends on an external framework, you inherit their bugs, their API churn, and their architectural decisions. Claude Code, Goose, Pi Mono, and Hermes Agent all own their core loop — for better or worse.

### Anti-Pattern 4: "Security is a README Notice"

| Project | Security Implementation | What They Say |
|---------|----------------------|---------------|
| **DeerFlow** | No auth, no RBAC, no rate limiting | "Improper deployment may introduce security risks" |
| **MiroFish** | None | No security section in docs |
| **Pi Mono** | Stealth mode impersonates Claude Code | No security documentation |

**Compare with Goose:** 5-inspector pipeline, env var blocklist, LLM-based adversary review. Security as architecture, not documentation.

### Anti-Pattern 5: Implicit Ordering Dependencies

**DeerFlow's middleware chain** has three ordering constraints documented as code comments:
1. ThreadDataMiddleware must be first
2. SummarizationMiddleware must be before MemoryMiddleware
3. ClarificationMiddleware must be last

These constraints exist as comments, not as code-enforced rules. At 14+ middlewares, one wrong insertion breaks the system silently. A dependency-aware registration system (topological sort) would prevent this class of bugs.

### Anti-Pattern 6: Memory as Flat File

| Project | Memory Format | Concurrency Safety | Structured Search |
|---------|--------------|-------------------|-------------------|
| **Claude Code** | `CLAUDE.md` (flat rules) | Manual only | No |
| **Hermes Agent** | `MEMORY.md` + `USER.md` | No file locking | FTS5 on sessions (separate system) |
| **DeerFlow** | JSON file (structured) | No file locking; mtime-based cache | Per-fact confidence scores |
| **MiroFish** | N/A | N/A | N/A |

**DeerFlow has the best schema** (hierarchical with confidence scores), but the worst implementation (no file locking, mtime-based invalidation). Two concurrent threads updating memory.json will corrupt it. **Hermes has the best recall** (FTS5 + LLM summarization over full session transcripts), but memory writes still go to a flat file.

### Anti-Pattern 7: Unrestricted Sub-Agent Spawning

| Project | Max Concurrent | Depth Limit | Can Children Write Memory? | Can Children Spawn Children? |
|---------|---------------|-------------|---------------------------|----------------------------|
| **Claude Code** | Configurable | 1 (flat) | N/A | No |
| **DeerFlow** | 3 (ThreadPool) | 1 | Yes (shared thread state) | No |
| **Hermes Agent** | 3 | 1 (blocked by tool restriction) | No (blocked) | No (blocked) |
| **oh-my-claudecode** | Configurable per team | 1 (workers) | Via file IPC | No |
| **Goose** | Configurable | Configurable | Not documented | Not documented |
| **Dify** | Via graph engine | 5 (`WORKFLOW_CALL_MAX_DEPTH`) | Via child variable pool | Yes (child engines) |

**Every project caps depth at 1** except Dify (depth 5) and Goose (configurable). This means recursive task decomposition — "refactor all error handling" → per-module workers → per-file sub-workers — is impossible in 8 out of 10 projects. This is a real ceiling for complex tasks.

---

## 7. If You Were Building an AI Agent from Scratch Today

Based on evidence from these 10 teardowns, here's what to do and what to avoid.

### Do This

| Recommendation | Evidence | Steal From |
|----------------|----------|------------|
| **Use a middleware/pipeline architecture** | DeerFlow's 14 middlewares keep each concern isolated and testable. Every cross-cutting feature (logging, cost tracking, safety) is composable. | **DeerFlow** |
| **Implement a multi-layer context cascade** | Claude Code's lossless-before-lossy principle prevents premature information loss. Start with cheap operations (pruning), escalate to expensive ones (LLM summarization). | **Claude Code** |
| **Build loop detection from day 1** | DeerFlow's hash-based detection (warn at 3, kill at 5, order-independent) prevents $200 API bills at 3am. Takes an afternoon to implement. | **DeerFlow** |
| **Add a tool inspection pipeline** | Goose's 5-inspector chain (Security → Egress → Adversary → Permission → Repetition) is defense-in-depth. At minimum, add a permission inspector and a repetition detector. | **Goose** |
| **Use functional tool composition** | Claude Code's `buildTool()` and Pi Mono's `ToolDefinition` co-locate schema, permissions, execution, and UI rendering. No inheritance, trivially testable. | **Claude Code, Pi Mono** |
| **Support MCP for extensibility** | Goose's 6-flavor extension system shows MCP can unify in-process, child-process, and remote tools under one interface. | **Goose** |
| **Freeze memory snapshots for prompt cache savings** | Hermes's frozen snapshot trick keeps MEMORY.md stable in the system prompt across a session, preserving provider prompt caches. | **Hermes Agent** |
| **Store full session transcripts** | Hermes's FTS5 search over full session history fills gaps that curated memory misses. You need both curated memory AND raw transcripts. | **Hermes Agent** |
| **Add structured memory with confidence scores** | DeerFlow's hierarchical memory schema with per-fact confidence scores enables decay and priority-based recall. | **DeerFlow** |
| **Use declarative provider configs** | Goose's JSON-file-per-provider pattern lets you add OpenAI-compatible providers without writing code. 10-line JSON file vs. 300-line adapter class. | **Goose** |
| **Block dangerous env vars for extensions** | Goose's 31-key blocklist prevents DLL injection and library preloading. Simple, effective, and nobody else does it. | **Goose** |

### Avoid This

| Anti-Pattern | Evidence | Worst Offender |
|--------------|----------|---------------|
| **Don't put everything in one file** | Hermes's 9,000-line `run_agent.py` is untestable, un-reviewable, and every PR conflicts. | **Hermes Agent** |
| **Don't skip cost budgets** | DeerFlow, Hermes, MiroFish, and OMC all track tokens but none set spending limits. First $300 runaway session will motivate the fix. | **All** |
| **Don't borrow your core loop** | MiroFish depends on OASIS, DeerFlow on LangGraph, OMC on Claude Code internals. When the upstream breaks, you break. | **oh-my-claudecode** (one Anthropic release away from non-functional) |
| **Don't rely on "advisory" security** | DeerFlow's security model is a README paragraph. No auth, no RBAC, deploy on a public IP and anyone executes code. | **DeerFlow** |
| **Don't use flat files for concurrent memory** | DeerFlow's mtime-based JSON cache invalidation will corrupt under concurrent writes. Use SQLite or proper file locking. | **DeerFlow** |
| **Don't hardcode middleware ordering** | DeerFlow's "ClarificationMiddleware MUST be last" is a code comment, not an enforced constraint. Use topological sort or explicit dependency declaration. | **DeerFlow** |
| **Don't impersonate other products** | Pi Mono's "stealth mode" mimics Claude Code tool names to get preferential API treatment. One Anthropic detection update away from rate limiting or key flagging. | **Pi Mono** |
| **Don't block children from useful tools** | Hermes blocks `execute_code` for sub-agents because "children should reason step-by-step." This makes sub-agents expensive grep wrappers. Trust architecture (sandboxing), not prohibition. | **Hermes Agent** |

### Recommended Stack for a New Agent (2026)

| Layer | Recommendation | Why |
|-------|---------------|-----|
| **Language** | TypeScript or Rust | TS for speed-to-market (5/10 projects use it); Rust for performance-critical agents (Goose proves it works) |
| **Agent loop** | Middleware chain with a thin orchestration shell | DeerFlow's pattern but with enforced ordering (dependency graph, not comments) |
| **Context management** | 3-layer cascade: prune → summarize middle → last-resort full compaction | Claude Code's L1-L4 simplified. Always protect head (system prompt) and tail (recent context). |
| **Tool system** | Functional composition + MCP for extensions | `buildTool()` for built-in tools, MCP for third-party. Pi Mono's TUI integration if you have a CLI. |
| **Security** | Inspector pipeline + env var blocklist + permission system | Goose's 5-inspector chain as the model. Add cost budgets (Dify's `ExecutionLimitsLayer`). |
| **Memory** | SQLite (structured) + flat file cache + FTS5 search | Hermes's FTS5 for recall, DeerFlow's schema for structure, Hermes's frozen snapshot for cache savings. |
| **Provider abstraction** | Declarative JSON configs + lazy loading | Goose's JSON-per-provider + Pi Mono's lazy import pattern. Zero cost for unused providers. |
| **Sub-agents** | Depth 2 with tool restrictions per depth | Allow depth > 1 (unlike everyone except Dify), but restrict dangerous tools per depth level. |
| **Loop detection** | Hash-based, order-independent, warn → kill escalation | DeerFlow's implementation, directly portable. |
| **Deployment** | Single binary, optional Docker for isolation | Avoid Dify's 7+ container sprawl. Goose proves you can ship a powerful agent as one binary. |

### The Three Questions Every Agent Architecture Must Answer

1. **What happens when context overflows?** (Claude Code answers this best: 4-layer cascade, lossless before lossy)
2. **What happens when a tool call is dangerous?** (Goose answers this best: 5-inspector pipeline with LLM-based adversary review)
3. **What happens when the agent gets stuck in a loop?** (DeerFlow answers this best: order-independent hashing, warn at 3, kill at 5)

If your architecture doesn't have clear answers to all three, you're building a demo, not a product.

---

*Generated from source-level teardowns in [awesome-ai-anatomy](https://github.com/NeuZhou/awesome-ai-anatomy). All claims reference specific files, line counts, and code patterns verified against actual source code.*
