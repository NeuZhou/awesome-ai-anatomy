> **Note:** This teardown analyzes code from a source map leak that became publicly available. All analysis is for educational and commentary purposes under fair use. No proprietary code is reproduced in sufficient quantity to substitute for the original work.

# 🔬 Claude Code: 510K Lines, a 1729-Line God Object, and 18 Virtual Pet Species Hidden in a Coding Agent

> **The most advanced AI coding agent in production, dissected.**
> 510,000 lines of TypeScript. 1,903 files. The complete architecture of how Anthropic built an AI that codes autonomously - revealed through an accidental npm source map leak.

> **Who is this for:** Engineers building AI agents, coding tools, or anyone curious about how a top-tier AI product is architected in production.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> 📌 This analysis tracks Claude Code's evolution. **Star to get updates** as new versions are analyzed.

## At a Glance

| Metric | Value |
|--------|-------|
| Stars | 109,546 (as of April 2026; originally analyzed from leaked source maps before public release) |
| Language | TypeScript |
| Lines of Code | ~510K (1,903 files) |
| Framework | Bun, React/Ink, Zod v4 |
| License | Proprietary (Anthropic) |

---

## Overall Rating

| Dimension | Grade | Notes |
|-----------|-------|-------|
| Architecture | A | 4-layer context management, 40+ tools as pure functions via buildTool(), streaming tool execution |
| Code Quality | A- | 510K LOC with Zod v4 schemas throughout, but the 1729-line core loop is a god object |
| Security | B+ | Per-tool permission model works, pet system bypasses normal trust boundaries |
| Documentation | A | Internal docs cover feature flags, tool contracts, and context cascade in detail |
| **Overall** | **A-** | **Production-proven at scale; the core loop needs splitting and the pet system needs rethinking** |

---

## Table of Contents

- [At a Glance](#at-a-glance)
- [Architecture Overview](#architecture-overview)
- [Tech Stack - Why These Choices](#tech-stack--why-these-choices)
- [The Brain: Agentic Loop](#the-brain-agentic-loop)
- [Core Innovation: Context Management - 4 Surgical Layers](#core-innovation-context-management--4-surgical-layers)
- [Streaming Tool Execution](#streaming-tool-execution--why-claude-code-feels-fast)
- [Tool System - 40+ Tools, Zero Inheritance](#tool-system--40-tools-zero-inheritance)
- [Feature Flags - Compile-time + Runtime](#feature-flags--the-best-engineering)
- [Multi-Agent Coordination](#multi-agent-coordination)
- [Unreleased Features](#unreleased-features-found-in-the-code)
- [Design Decisions - The "Why" Analysis](#design-decisions--the-why-analysis)
- [Stuff Worth Stealing](#stuff-worth-stealing)
- [Limitations & Potential Issues](#limitations--potential-issues)
- [Comparison with Alternatives](#comparison-with-alternatives)
- [Cross-Project Comparison](#cross-project-comparison)
- [Key Takeaways](#key-takeaways)
- [Hooks & Easter Eggs](#hooks--easter-eggs)
- [How the Source Became Public](#how-the-source-became-public)
- [Verification Log](#verification-log)

---

## Architecture Overview

![Architecture](architecture.png)

<details>
<summary>Mermaid source (click to expand)</summary>

```mermaid
graph LR
    subgraph Entry["🚀 CLI Entry"]
        CLI["claude CLI\n(Bun runtime)"] -->|"lazy import()"| App["Main App\n(React/Ink TUI)"]
    end

    subgraph Session["📋 Session Layer"]
        App --> SM["Session Manager"]
        SM --> Auth["Auth\n(OAuth/API Key/Bedrock/Vertex)"]
        SM --> Config["Config + Feature Flags"]
        SM --> Mem["Memory (.claude/)"]
    end

    subgraph Core["⚡ Agentic Core (query.ts - 1,729 lines)"]
        SM --> Loop["while(true)"]
        Loop --> Pre["Preprocess\n(4-layer context mgmt)"]
        Pre --> API["Claude API\n(streaming SSE)"]
        API --> Parse["Parse Response\n(detect tool_use)"]
        Parse --> Exec["StreamingToolExecutor\n(parallel execution)"]
        Exec -->|"results → messages"| Loop
    end

    subgraph Tools["🔧 Tool System (40+)"]
        Exec --> Bash["BashTool\n(sandbox, timeout)"]
        Exec --> File["FileRead/Write"]
        Exec --> Search["Search/Grep"]
        Exec --> MCP["MCP Bridges"]
        Exec --> Agent["Agent Spawn"]
    end

    subgraph Context["🧠 Context Management"]
        Pre --> L1["L1: HISTORY_SNIP\nSurgical deletion"]
        L1 --> L2["L2: Microcompact\nCache-level editing"]
        L2 --> L3["L3: CONTEXT_COLLAPSE\nStructured archival"]
        L3 --> L4["L4: Autocompact\nFull compression"]
    end

    classDef primary fill:#2563eb,stroke:#1e40af,color:#fff
    classDef secondary fill:#7c3aed,stroke:#5b21b6,color:#fff
    classDef accent fill:#059669,stroke:#047857,color:#fff
    classDef warn fill:#d97706,stroke:#b45309,color:#fff
    classDef neutral fill:#374151,stroke:#1f2937,color:#fff

    class CLI primary
    class Loop secondary
    class Pre secondary
    class Exec accent
    class Bash accent
    class MCP accent
```

</details>

---

## Tech Stack - Why These Choices

| Choice | What | Why (not obvious) |
|--------|------|-------------------|
| **Bun** | Runtime | 4-5x faster cold start than Node. But the real reason: compile-time macros for feature flags. `feature()` calls become dead code elimination - unreleased features physically don't exist in the binary. |
| **React + Ink** | Terminal UI | Not for aesthetics - for state management. Multiple parallel agents, streaming outputs, user interrupts, permission dialogs. React's declarative model handles this complexity better than imperative TUI libs. |
| **TypeScript** | Language | Strict types + Zod v4 for runtime schema validation. Every tool input is validated before execution. |
| **No class inheritance** | Architecture | 40+ tools, all pure functions via `buildTool()`. Composition over inheritance. Each tool is self-contained: schema, permissions, execution, UI rendering, context summary - all in one file. |

**The trade-off nobody talks about:** Bun's npm compatibility is ~99%, but that 1% means occasional native addon issues. Ink is essentially a one-person project (Vadim Demedes) with declining commit frequency. Anthropic likely maintains an internal fork.

---

## The Brain: Agentic Loop

The entire agent runs from one file: `src/query.ts`, 1,729 lines.

```
while (true) {
    ① Trim context (4-layer cascade)
    ② Pre-fetch memory + skills
    ③ Call Claude API (streaming)
    ④ While receiving stream → detect tool_use blocks
       → Start executing tools IMMEDIATELY (don't wait!)
    ⑤ Tools called? → append results → continue loop
    ⑥ No tools? → return response → exit
}
```

**Why while(true) instead of a state machine?**

The agentic loop is fundamentally sequential: model speaks → tools execute → model speaks again. 90% of the time there are only two states: "waiting for model" and "executing tools." A state machine would add formality without adding clarity.

**The cost:** 1,729 lines in one file is a code smell. This file handles input processing, API calls, streaming parsing, tool dispatch, error recovery, and context management. Any cross-cutting change touches everything. The team presumably reviews changes to this file with extreme caution.

If I were leading the next architecture review, I'd split it into three modules: **conversation orchestrator**, **tool dispatcher**, and **context manager**. Keep the loop, but make it a thin orchestration layer.

---

## Core Innovation: Context Management - 4 Surgical Layers

This is the most sophisticated part of the codebase. Most agents use a single "summarize and truncate" approach. Claude Code uses four mechanisms, applied in cascade:

```mermaid
graph LR
    Start["Context too long?"] --> L1["L1: HISTORY_SNIP\nSurgical deletion, lossless"]
    L1 -->|"still too long"| L2["L2: Microcompact\nCache-level editing\nAPI tells model to ignore cached tokens"]
    L2 -->|"still too long"| L3["L3: CONTEXT_COLLAPSE\nStructured archival\nGit-commit-log style summaries"]
    L3 -->|"still too long"| L4["L4: Autocompact\nFull compression, last resort"]

    classDef primary fill:#2563eb,stroke:#1e40af,color:#fff
    classDef secondary fill:#7c3aed,stroke:#5b21b6,color:#fff
    classDef accent fill:#059669,stroke:#047857,color:#fff
    classDef warn fill:#d97706,stroke:#b45309,color:#fff
    classDef neutral fill:#374151,stroke:#1f2937,color:#fff

    class Start primary
    class L1 accent
    class L2 accent
    class L3 warn
    class L4 warn
```

**The design principle:** Lossless before lossy. Local before global.

Layer 1 only removes irrelevant messages - zero information distortion. Layer 2 hides tokens at the cache level without modifying content. Layer 3 starts compressing but preserves structure. Layer 4 is the nuclear option.

**What I'd add:** An attention-weighted importance scoring layer between L1 and L2. Current HISTORY_SNIP likely uses time-based heuristics (delete oldest). But a 20-turn-old message containing "never use framework X" is more important than a 2-turn-old "file saved successfully." Importance signals: reference frequency in later turns, explicit user constraints, tool results containing file paths or configs.

**The hidden problem:** Compression is irreversible and unauditable. After L3/L4, the model doesn't know what it forgot. It can't say "I may have lost context on this" - it just confidently answers based on incomplete information. This is worse than forgetting; it's not knowing that you forgot.

---

## Streaming Tool Execution - Why Claude Code Feels Fast

```mermaid
sequenceDiagram
    participant M as Claude API (streaming)
    participant SE as StreamingToolExecutor
    participant R as Read Tools (parallel)
    participant W as Write Tools (exclusive)

    M->>SE: tool_use: grep
    SE->>R: ⚡ Start immediately
    M->>SE: tool_use: read_file
    SE->>R: ⚡ Start in parallel
    Note over R: Both running while\nmodel still talks
    M->>SE: tool_use: write_file
    R-->>SE: grep results
    R-->>SE: file contents
    SE->>W: 🔒 Exclusive lock
    W-->>SE: write complete
    M->>SE: [stream end]
    SE-->>M: All results (ordered)
```

**Key design:** Read-only tools run in parallel. Write tools get exclusive locks. Results are buffered in receive order.

This is essentially a **reader-writer lock (RWLock)** pattern. Simple, provably correct, but not optimal. The subtle risk: if a tool is incorrectly marked as read-only but actually has side effects (e.g., a search tool that creates cache files), parallel execution could cause race conditions.

Another edge case: two read tools read different parts of the same file, but an external process modifies the file between reads (user runs `git pull` in another terminal). The model sees a file state that never existed. Claude Code accepts this risk - the window is small and the model self-corrects on the next turn.

---

## Tool System - 40+ Tools, Zero Inheritance

Every tool is a `buildTool()` factory function:

```typescript
ToolDefinition = {
    name           // "bash"
    description    // For Claude to understand when to use it
    inputSchema    // Zod v4 → auto-generates JSON Schema
    call()         // AsyncGenerator (streaming results)
    isReadOnly()   // Can it run in parallel?
    getPermissions() // What does user need to approve?
    renderToolUse()  // React component for terminal display
    getToolUseSummary() // Compressed version for context mgmt
}
```

**Why this works at 40 tools:** Tools have almost no shared behavior worth inheriting. A file reader and a bash executor have less in common than you'd think. Shared concerns (validation, error handling) are handled by higher-order functions, not base classes.

**Where it might break:** At 100+ tools with "tool families" (10 database tools sharing connection management, transaction handling, retry logic). The `buildTool()` boilerplate would balloon - 70% repeated pipeline configuration. Solution: lightweight tool factories (still functions, not classes) for tool families.

**BashTool - the most complex:**
- Auto-classifies commands (search/read/write)
- macOS: runs in `sandbox-exec` sandbox
- Commands blocking >15s: auto-moved to background
- Large outputs: saved to disk, model gets file path reference
- Built-in sed command parser

---

## Feature Flags - The Best Engineering

Two layers, each with a specific purpose:

### Compile-time: Dead Code Elimination

```javascript
import { feature } from 'bun:bundle'

const voiceModule = feature('VOICE_MODE')
    ? require('./voice/index.js')  // Exists in binary
    : null                          // Physically gone
```

Not just disabled - **deleted from the binary**. Security researchers can't find what doesn't exist. This is why Bun was chosen over Node.

### Runtime: A/B Testing

```javascript
// All gates prefixed "tengu_" - Japanese for heavenly dog
// Internal codename for the Claude Code project
const enabled = checkStatsigFeatureGate_CACHED_MAY_BE_STALE(
    'tengu_streaming_tool_execution2'
)
```

Reads from disk cache, accepts stale reads, never blocks startup.

### The Research Angle: Ablation Testing

```javascript
if (feature('ABLATION_BASELINE')) {
    // Disables: thinking, compaction, auto-memory, background tasks
    // Measures: what does each feature ACTUALLY contribute?
}
```

This team uses research methodology in production engineering. They can quantify the impact of every feature. Most companies can't - or won't - pay this complexity tax. It's a luxury that comes from being a research lab building a product, not a product company doing research.

---

## Multi-Agent Coordination

```mermaid
graph LR
    Main["Main Agent\nTools: TeamCreate, SendMessage, StopWorker"]
    Main -->|spawns| W1["Worker 1"]
    Main -->|spawns| W2["Worker 2"]
    Main -->|spawns| W3["Worker 3"]

    W1 -.-|"❌ Cannot spawn sub-workers"| X1["No TeamCreate"]
    W2 -.-|"❌ No infinite nesting"| X2["No TeamCreate"]

    classDef primary fill:#2563eb,stroke:#1e40af,color:#fff
    classDef secondary fill:#7c3aed,stroke:#5b21b6,color:#fff
    classDef accent fill:#059669,stroke:#047857,color:#fff
    classDef warn fill:#d97706,stroke:#b45309,color:#fff
    classDef neutral fill:#374151,stroke:#1f2937,color:#fff

    class Main primary
    class W1 secondary
    class W2 secondary
    class W3 secondary
    class X1 warn
    class X2 warn
```

Workers cannot create sub-workers - prevents resource explosion. Three backends: tmux panes, in-process, remote.

**My critique:** This is an artificial ceiling. Complex tasks benefit from recursive decomposition ("refactor all error handling" → per-module workers → per-file sub-workers). A depth limit + global worker budget would be more flexible than a hard ban on nesting.

---

## Unreleased Features Found in the Code

### 🎤 Voice Mode (codename: Amber Quartz)
Full `src/voice/` directory. Only works with Claude.ai OAuth. Has a kill switch: `tengu_amber_quartz_disabled`.

### 🌉 Bridge Mode: Remote Desktop Control
`claude remote-control` turns your local environment into a remote terminal for claude.ai. Up to 32 concurrent sessions. JWT auth + trusted device mechanism.

### 🐣 Buddy: The Virtual Pet System

18 species. 5 rarity tiers (Common 60% → Legendary 1%). RPG stats: DEBUGGING, PATIENCE, CHAOS, WISDOM, SNARK. Hats (crown, top hat, propeller hat, halo, wizard hat). 1% shiny variants.

All species names are hex-encoded:
```javascript
// "One species name collides with a model-codename canary"
const duck = String.fromCharCode(0x64,0x75,0x63,0x6b)
```

One of these 18 names is the codename for Anthropic's next model: duck, goose, blob, cat, dragon, octopus, owl, penguin, turtle, snail, ghost, axolotl, capybara, cactus, robot, rabbit, mushroom, chonk.

---

## Design Decisions - The "Why" Analysis

### Why not a state machine?

| Approach | Pros | Cons |
|----------|------|------|
| **while(true)** ✅ | One file, linear flow, easy to prototype | 1,729-line God Object, hard to test, fragile error recovery |
| State Machine | Explicit states, testable transitions, clean error states | Upfront design cost, more code |
| Actor Model | Natural parallelism, isolated state | Highest complexity, overkill for sequential agent |

Claude Code chose the simplest option and shipped fast. The tech debt is real (1,729-line monolith), but the pragmatism is defensible for a team that needed to iterate rapidly.

### Why functional tools over class inheritance?

At 40 tools: functions win. No diamond problem, no fragile base class, trivially testable.
At 100+ tools with tool families: you'd need lightweight factories (still functions) to reduce boilerplate.
At 500+ tools: probably need a plugin architecture with dynamic loading.

Claude Code is at 40. They made the right call for their current scale.

### Context cascade vs. sliding window vs. RAG

| Approach | Strength | Weakness |
|----------|----------|----------|
| **4-layer cascade** ✅ | Importance-aware, progressive degradation | Complex, non-deterministic compression quality |
| Sliding window | Simple, predictable | Uniform information loss - drops important early context |
| RAG retrieval | "Never forgets" | Retrieval relevance not guaranteed, adds latency, poor at maintaining conversational continuity |

For coding tasks, **continuity matters more than retrieval**. You need coherent understanding of the current task flow, not keyword search over past conversations. The cascade approach is the right fit.

---

## Cross-Project Comparison

| Feature | Claude Code | DeerFlow 2.0 | Goose | OpenClaw |
|---------|-------------|-------------|-------|----------|
| Language | TypeScript | Python + TS | Rust | TypeScript |
| LOC | ~510K | ~180K | ~200K | ~50K (est.) |
| Agent Loop | Single 1,729-line file | LangGraph + 14 middlewares | Extension-based | Event-driven |
| Context Management | 4-layer cascade (surgical) | Summarization middleware | Auto-compact (80%) | Configurable compaction |
| Tool Architecture | `buildTool()` functional (40+) | LangGraph tools | MCP-native extensions | MCP + Skills |
| Sub-agents | Workers (flat, no nesting) | ThreadPool (depth 1) | subagent_handler | Configurable |
| Provider Lock-in | Anthropic only | Any (via LangGraph) | None (30+ providers) | Any (via config) |
| Feature Flags | Compile-time (Bun) + runtime (GrowthBook) | Runtime only | Cargo features | Runtime config |
| Terminal UI | React + Ink | No (web UI) | Electron desktop | Terminal + web |
| Security Model | Sandbox + allowlist | Advisory only | 5-inspector pipeline | Command approval |
| License | Proprietary | MIT | Apache-2.0 | MIT |

Claude Code is the most complex and most opinionated of the four — it controls the full stack from UI to API calls. The trade-off is Anthropic lock-in and a proprietary license. DeerFlow offers the most middleware extensibility, Goose the broadest provider support, and OpenClaw the lightest footprint.

---

## Stuff Worth Stealing

### 1. The 4-Layer Context Cascade
Lossless before lossy, local before global. Most agents do one-shot summarization or sliding windows. Claude Code's progressive degradation — surgical deletion → cache-level hiding → structured archival → full compression — preserves maximum information at each stage. Any long-running agent benefits from this pattern.

### 2. Streaming Tool Execution with RWLock
Start executing read-only tools while the model is still generating. Read tools run in parallel; write tools get exclusive locks. The UX speedup is real and the implementation is straightforward — a reader-writer lock pattern applied to tool dispatch.

### 3. `buildTool()` Factory Over Inheritance
Each tool is a plain object with schema, permissions, execution, UI rendering, and context summary — all co-located in one file. No base class, no inheritance chain, no registration ceremony. At 40+ tools this scales better than class hierarchies because tools share almost no behavior.

---

## Limitations & Potential Issues

1. **query.ts God Object** - 1,729 lines handling everything. Merge conflicts in multi-person teams. Implicit state assumptions between distant code sections. A hidden dependencies nightmare.

2. **Context compression is unauditable** - After compression, the model doesn't know what it lost. It can't flag "I may be missing context here." This leads to confident wrong answers, which is worse than admitting uncertainty.

3. **Worker nesting prohibition** - Prevents recursive task decomposition. "Refactor all error handling in this project" ideally decomposes hierarchically. The flat worker model forces the main agent to do all decomposition, becoming a bottleneck.

4. **Dual feature flag cognitive overhead** - Compile-time Bun macros + runtime GrowthBook gates. Engineers must decide which system each flag belongs in. Migration between systems (gradual rollout → permanent) requires code changes and redeployment.

---

## Comparison with Alternatives

### vs. Cursor
- **Cursor** = IDE augmentation (VSCode fork). Advantage: real-time editor integration, LSP access, inline diffs.
- **Claude Code** = independent terminal agent. Advantage: composable (pipes, SSH, CI/CD), lightweight, environment-agnostic.
- Long-term bet: agent paradigm wins. Editors are one step in the development pipeline; agents can span the entire pipeline.

### vs. LangChain Tool System
- LangChain: general-purpose, supports any LLM, class-based `StructuredTool`. Trade-off: abstraction leakage, debugging through callback systems.
- Claude Code: single-model optimized, functional, zero abstraction layers. Trade-off: not portable to other models.
- If you only need Claude: copy Claude Code's approach. If you need multi-model: use LiteLLM for provider abstraction + custom tool system.

---

## Key Takeaways

1. **Context management is THE engineering challenge** - not prompts, not models. The 4-layer cascade is the most sophisticated production implementation I've seen.

2. **Stream-then-execute beats wait-then-execute** - start tool execution during model generation. The UX improvement justifies the engineering complexity.

3. **Functional composition > inheritance for tool systems** - at least up to ~100 tools. Keep it simple until you can't.

4. **Use research methods in production** - ablation testing, quantified feature impact. Know what each feature actually contributes. Most won't. The best teams do.

5. **The terminal is underestimated** - React + Ink enables complex interactive UIs in a CLI. Don't limit yourself to ncurses-era thinking.

---

## Hooks & Easter Eggs

**18 virtual pet species with hex-encoded names.** The `Buddy` system hides species names behind `String.fromCharCode()` calls — duck, goose, blob, cat, dragon, octopus, owl, penguin, turtle, snail, ghost, axolotl, capybara, cactus, robot, rabbit, mushroom, chonk. One collides with an internal model codename canary. RPG stats (DEBUGGING, PATIENCE, CHAOS, WISDOM, SNARK), 5 rarity tiers, 1% shiny variants, and hats. All this in a coding agent.

**KAIROS autonomous mode.** Buried in the feature flags is a mode called KAIROS that enables fully autonomous operation — the agent runs without human approval for tool calls. The name isn't random: Kairos (καιρός) is the Greek concept of "the right moment." Someone on the team has a classics background.

**Anti-distillation fake tools.** The source contains tool definitions that don't actually do anything — they exist to poison training data if a competitor tries to distill Claude Code's behavior by recording its tool calls. If you see a tool call to something that sounds plausible but isn't in the official documentation, it might be a canary.

**The `tengu_` prefix.** Every runtime feature gate is prefixed `tengu_` — Japanese for a supernatural creature (天狗, heavenly dog). It's the internal codename for the Claude Code project. You'll find it in every `checkStatsigFeatureGate` call.

**`ABLATION_BASELINE` mode.** A compile-time flag that disables thinking, compaction, auto-memory, and background tasks simultaneously. This isn't a debug tool — it's a research methodology. They can quantify exactly what each feature contributes by measuring performance with it stripped out. Research lab building a product, not a product company doing research.

---

## How the Source Became Public

npm publish included `.map` files → `.map` referenced a source zip on Cloudflare R2 → R2 URL had no access control. That's it.

**Lessons:**
- Whitelist `files` in package.json
- CI step: check published artifacts for `.map` files
- Source archive URLs need authentication
- Build artifacts and source access control should be managed independently

---

## About This Project

**awesome-ai-anatomy** dissects the architecture of important AI projects - one project at a time.

- 📐 Architecture diagrams (Mermaid + hand-drawn style)
- 🔍 Design decision analysis (why, not just what)
- ⚖️ Trade-off discussions
- 🔬 Comparison with alternatives

**Next up:** ByteDance DeerFlow, LangChain, Dify

---

## Verification Log

<details>
<summary>Fact-check log (click to expand)</summary>

| Claim | Verification Method | Result |
|-------|-------------------|--------|
| 109,558 stars | GitHub API (`/repos/anthropics/claude-code`) | ✅ Verified |
| 18,175 forks | GitHub API | ✅ Verified |
| ~510K lines of TypeScript | Reported in source analysis (1,903 files) | ✅ Consistent with source map analysis |
| Language: TypeScript | Source map contents + npm package | ✅ Verified (GitHub shows Shell for wrapper scripts) |
| License: Proprietary | No OSS license file; Anthropic terms of service | ✅ Verified |
| First commit 2025-02-22 | GitHub API `created_at` | ✅ Verified |
| Latest release v2.1.92 | GitHub API `/releases/latest` | ✅ Verified (2026-04-04) |
| `query.ts` is 1,729 lines | Source map analysis | ✅ Reported across multiple independent analyses |
| 40+ tools | `buildTool()` instances in source | ✅ Consistent with source analysis |
| 18 virtual pet species | Buddy system in source map | ✅ Verified (duck through chonk) |
| 4-layer context management | Source analysis (HISTORY_SNIP, Microcompact, CONTEXT_COLLAPSE, Autocompact) | ✅ Verified |
| Bun runtime | `package.json` + source map | ✅ Verified |
| React + Ink TUI | Dependencies in source map | ✅ Verified |
| Feature flags: `tengu_` prefix | Runtime gate calls in source | ✅ Verified |

</details>

---

*Analysis by [awesome-ai-anatomy](https://github.com/NeuZhou/awesome-ai-anatomy)*
*Based on publicly reported source analysis. All code copyright Anthropic. No source code is hosted in this repository.*
