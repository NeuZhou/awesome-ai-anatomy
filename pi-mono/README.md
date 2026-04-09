# Pi Mono: The Game Framework Guy Built a Better Claude Code — and Hid a "Stealth Mode" Inside

> Mario Zechner (the libGDX guy) built a Claude Code alternative, and you can tell it's from a game developer. Scene-graph thinking applied to LLM provider abstraction, lazy loading patterns borrowed from texture streaming, and a "stealth mode" that impersonates Claude Code's tool names to dodge Anthropic's rate limits.

## At a Glance

| Metric | Value |
|--------|-------|
| Stars | 32,049 |
| Forks | 3,488 |
| Language | TypeScript |
| Framework | Node.js (pure, no React/Electron) |
| Lines of Code | 147,444 (583 .ts files) |
| License | MIT |
| First Commit | 2025-08-09 |
| Latest Release | v0.65.2 (npm) |
| Data as of | April 2026 |

Pi is a monorepo of seven npm packages that together form a full stack for building AI-powered coding agents. Run `npx @mariozechner/pi-coding-agent` and you get an interactive terminal agent that reads, edits, and writes code — like Claude Code, but open source, multi-provider, and with a TUI library you can actually reuse. The website is literally called `shittycodingagent.ai`.

---

## Overall Rating

| Dimension | Grade | Notes |
|-----------|-------|-------|
| Architecture | B+ | 7 npm packages, game-engine layering (pi-ai as renderer abstraction, pi-agent-core as game loop) |
| Code Quality | B | 147K LOC across 583 .ts files; lazy provider loading borrowed from texture streaming patterns |
| Security | C | "Stealth mode" impersonates Claude Code's tool names to dodge rate limits — ToS violation risk |
| Documentation | B- | shittycodingagent.ai is honest about scope; internal package boundaries need better docs |
| **Overall** | **B** | **Game-engine architecture applied to LLM agents is a fresh perspective; stealth mode is a liability** |

## Architecture


![Architecture](pi-mono-1.png)

![Architecture](architecture.png)





The stack is layered in a way that'll feel familiar if you've worked with game engines: `pi-ai` is the renderer abstraction (swap OpenGL for Anthropic), `pi-agent-core` is the game loop (stream→toolcall→execute→repeat), `pi-tui` is the scene graph (differential rendering, component hierarchy), and `pi-coding-agent` is the actual game (all the content, modes, UI).

This layering isn't just nice architecture — it's load-bearing. Because `pi-ai` is a standalone npm package, you can use it to build completely different things. The Slack bot (`pi-mom`) does exactly that: it imports the AI layer and agent core, bolts on Slack-specific tools, and runs without the TUI at all. The web UI similarly imports `pi-ai` and `pi-agent-core` as Lit-based web components.

What surprised me: the dependency graph is *strict*. `pi-tui` has zero dependency on `pi-ai`. The TUI library stands alone. In a world where most agent frameworks smear LLM concerns across every layer, this discipline is rare.

**Files to reference:**
- `packages/ai/src/types.ts` — 305 lines defining the unified message/model/stream protocol
- `packages/agent/src/agent.ts` — the Agent class with steering/followUp queues
- `packages/coding-agent/src/core/agent-session.ts` — 1500+ line session orchestrator
- `packages/tui/src/tui.ts` — differential terminal renderer

---

## Core Innovation

### 1. The Unified Provider Protocol with Lazy Loading

Pi doesn't use an LLM SDK wrapper library like Vercel AI or LiteLLM. It defines its own protocol — `Model<TApi>`, `Context`, `StreamFunction`, `AssistantMessageEventStream` — and implements every provider natively.

```typescript
// From packages/ai/src/types.ts:9-11
export type KnownApi =
 | "openai-completions"
 | "mistral-conversations"
 | "openai-responses"
 | "azure-openai-responses"
 | "openai-codex-responses"
 | "anthropic-messages"
 | "bedrock-converse-stream"
 | "google-generative-ai"
 | "google-gemini-cli"
 | "google-vertex";
```

Each provider is loaded lazily via dynamic import. The first time you call `streamSimple()` for, say, Anthropic, it dynamically imports `./anthropic.js`, caches the module, and forwards the stream. If you never use Google, that provider code never loads.

```typescript
// From packages/ai/src/providers/register-builtins.ts (simplified)
function loadAnthropicProviderModule() {
 anthropicProviderModulePromise ||= import("./anthropic.js").then((module) => ({
 stream: module.streamAnthropic,
 streamSimple: module.streamSimpleAnthropic,
 }));
 return anthropicProviderModulePromise;
}
```

This is straight from game development: don't load the texture until the player sees the wall. It means `pi-ai`'s startup cost doesn't scale with the number of supported providers.

### 2. "Stealth Mode" — Impersonating Claude Code

This is the most audacious thing in the codebase. In `packages/ai/src/providers/anthropic.ts`, you'll find this:

```typescript
// From packages/ai/src/providers/anthropic.ts:68-71
// Stealth mode: Mimic Claude Code's tool naming exactly
const claudeCodeVersion = "2.1.75";

// Claude Code 2.x tool names (canonical casing)
const claudeCodeTools = [
 "Read", "Write", "Edit", "Bash", "Grep", "Glob",
 "AskUserQuestion", "EnterPlanMode", "ExitPlanMode",
 "KillShell", "NotebookEdit", "Skill", "Task",
 "TaskOutput", "TodoWrite", "WebFetch", "WebSearch",
];
```

Pi renames its tools to match Claude Code's exact casing before sending requests to Anthropic. Why? Because Anthropic gives Claude Code preferential treatment — likely better rate limits, prompt caching, or routing. By mimicking Claude Code's tool names, pi piggybacks on that treatment.

The author even links to a history tracker for Claude Code's prompts (`https://cchistory.mariozechner.at`), which is a side project by the same person. That's some serious competitive intelligence.

---

## How It Actually Works

### The Agent Loop — Scene-Graph-Style Event Pumping



![The Agent Loop — Scene-Graph-Style Event Pumping](pi-mono-2.png)

If you squint, this is a game loop. Every "frame" (turn):

1. Poll input (steering messages — the user typing while the agent is working)
2. Run simulation (LLM call → tool execution → state update)
3. Render (emit events to UI subscribers)

The steering/follow-up queue system is the standout design here. Most coding agents block user input while processing. Pi lets you type a correction *while the agent is running*, and it gets injected between tool calls. The queue has two lanes: "steering" messages (injected immediately after the current turn) and "follow-up" messages (wait until the agent would otherwise stop).

```typescript
// From packages/agent/src/agent.ts:110-114
/** Queue a message to be injected after the current assistant turn finishes. */
steer(message: AgentMessage): void {
 this.steeringQueue.enqueue(message);
}
/** Queue a message to run only after the agent would otherwise stop. */
followUp(message: AgentMessage): void {
 this.followUpQueue.enqueue(message);
}
```

This maps directly to how game engines handle input buffering — you don't process the jump command mid-physics-step; you queue it and apply it at the right phase boundary.

### The Extension System — "Everything is a Plugin" Done Right



![The Extension System — "Everything is a Plugin" Done Right](pi-mono-3.png)

Pi's extension system has more event types than most agent frameworks have total API surface. Extensions can:

- Intercept and modify tool calls before execution (`tool_call` event with mutable `event.input`)
- Replace tool results after execution (`tool_result` event)
- Replace the entire compaction strategy (`session_before_compact`)
- Register custom LLM providers with OAuth flows
- Render custom TUI components for tool results
- Register keyboard shortcuts and CLI flags

The `ToolDefinition` type is worth examining because it shows how deeply the TUI-rendering concern is integrated:

```typescript
// From packages/coding-agent/src/core/extensions/types.ts (simplified)
export interface ToolDefinition<TParams, TDetails, TState> {
 name: string;
 description: string;
 parameters: TParams; // TypeBox schema
 execute(toolCallId, params, signal, onUpdate, ctx): Promise<AgentToolResult<TDetails>>;
 renderCall?: (args, theme, context) => Component; // TUI renderer
 renderResult?: (result, options, theme, context) => Component;
}
```

Each tool definition includes optional `renderCall` and `renderResult` methods that return TUI Components. This means a tool can control *exactly* how it looks in the terminal. The `bash` tool shows truncated output with keybinding hints. The `edit` tool shows a unified diff with syntax highlighting. This isn't possible when tools are decoupled from their rendering (as in most frameworks).

### Context Compaction — Automatic and Extension-Overridable

Pi tracks token usage across turns and compacts automatically when it approaches the context window threshold. The compaction itself is done by calling the LLM to summarize the conversation, but extensions can completely replace this:

```typescript
// From packages/coding-agent/src/core/extensions/types.ts
/** Fired before context compaction (can be cancelled or customized) */
export interface SessionBeforeCompactEvent {
 type: "session_before_compact";
 preparation: CompactionPreparation;
 branchEntries: SessionEntry[];
 customInstructions?: string;
 signal: AbortSignal;
}
```

There's also overflow recovery: if an LLM returns a context-overflow error, pi automatically removes the error message from context, runs compaction, and retries. Combined with auto-retry for rate limits (exponential backoff with configurable max retries), the system handles most transient failures without user intervention.

---

## The Verdict

The monorepo structure is the best I've seen in the coding agent space. The package boundaries are clean and meaningful — `pi-ai` (37K lines) and `pi-tui` (18K lines) are genuine standalone libraries that could live in their own repos. The dependency graph flows one way, and there's no package that secretly imports everything. This is unusual; most agent projects have a "utils" or "shared" package that becomes a dumping ground. Pi doesn't.

The "stealth mode" is a double-edged thing. It's technically impressive competitive intelligence, and it tells you something about how seriously badlogic takes performance optimization. But it's also impersonating another product to get around provider restrictions, which feels like a ticking time bomb. Anthropic could detect the impersonation and break it, or worse, flag the API key. The fact that it's shipped as default behavior (not opt-in) is a bold choice.

The 69K-line `coding-agent` package is both the strength and the weakness. It contains everything from compaction algorithms to TUI components to extension loading to session management. The `AgentSession` class alone is over 1,500 lines with mixed concerns: model management, compaction, retry logic, bash execution, extension lifecycle, and session persistence all live in one class. This is the "god class" anti-pattern we saw in Hermes Agent's 9K-line `run_agent.py`, just split across more methods. The game loop metaphor breaks down here — in a real game engine, the physics system, renderer, and input handler are separate objects.

The TUI library is legitimately good and underappreciated. Differential terminal rendering (only redraw changed lines/cells) is hard to get right, and Pi handles it with cursor marker protocols, Kitty image support, and proper ANSI escape handling. This is the part where badlogic's libGDX experience shows most clearly — game rendering is all about minimizing draw calls, and that's exactly what differential TUI rendering is.

Would I use pi-ai as a standalone LLM library? Yes, if I needed multi-provider support without Vercel AI's framework opinions. Would I use pi as my daily coding agent? It depends on how much you trust the stealth mode — and whether you want to bet on a one-person project vs. Anthropic's Claude Code team.

---

## Cross-Project Comparison

| Feature | Pi Mono | Claude Code | OpenClaw | DeerFlow |
|---------|---------|-------------|----------|----------|
| **Architecture** | Monorepo, layered packages | Monolithic CLI | Gateway + channel plugins | LangGraph middleware |
| **Provider support** | 10+ (native implementations) | Claude only | Multi-model (via config) | Single provider |
| **UI framework** | Custom TUI + Web Components | Custom TUI (Ink-based) | Terminal + multi-channel | Web UI (Next.js) |
| **Extension model** | 30+ event hooks + custom tools | Internal tools only | Skill system + MCP | Middleware chain |
| **Context management** | Auto-compaction + overflow recovery | 4-layer cascade | Memory DAG + compaction | SummarizationMiddleware |
| **Multi-agent** | No (single agent) | No | Subagent spawning | Thread pool (max 3) |
| **Session persistence** | JSONL tree (branching) | .claude/ directory | MEMORY.md + daily files | JSON file |
| **Self-hosted LLM** | Yes (pi-pods for vLLM) | No | No | No |
| **Slack/messaging** | Yes (pi-mom) | No | Yes (multi-channel) | Yes (Feishu/Slack) |

Pi occupies a unique spot: it's the only project that ships both a standalone LLM API library and a GPU pod management tool alongside the coding agent. It's also the only one with native web components for building custom chat UIs. Where OpenClaw goes wide on channels and DeerFlow goes deep on middleware, Pi goes deep on developer infrastructure.

---

## Stuff Worth Stealing

### 1. Lazy Provider Loading Pattern

The dynamic import + promise caching pattern for provider modules is reusable anywhere you have multiple backends. Zero cost until first use, and the module is loaded exactly once.

```typescript
// From packages/ai/src/providers/register-builtins.ts
let modulePromise: Promise<Module> | undefined;
function loadModule() {
 modulePromise ||= import("./provider.js").then(m => ({
 stream: m.streamFn,
 streamSimple: m.streamSimpleFn,
 }));
 return modulePromise;
}
```

### 2. Steering/Follow-Up Queue System

Two-lane input queuing during agent execution — "steering" for interruptions, "follow-up" for post-completion. This is the right abstraction for any interactive agent system where users want to correct course mid-flight.

### 3. Tool Definition with Integrated TUI Rendering

Coupling tool execution with tool rendering in a single definition means tools own their entire user experience. The `renderCall` / `renderResult` split is clean and easy to reason about.

---

## Hooks & Easter Eggs

**The website URL:** `shittycodingagent.ai`. Badlogic registered this domain. The repo's README links to it as the official site. This tells you everything about the marketing philosophy.

**Claude Code History Tracker:** Badlogic runs `https://cchistory.mariozechner.at`, which archives Claude Code's system prompts across versions. Used as a reference for the stealth mode implementation. The project is linked from within the source code.

**The "mom" package name:** The Slack bot that delegates to the coding agent is called "mom." No documentation explains why. My best guess: it's the thing that tells the agent what to do.

**OSS Weekend Mode:** There's a script (`scripts/oss-weekend.mjs`) that auto-closes all issues and PRs from non-maintainers for a configurable date range. The current README banner says "I'm deep in refactoring internals, and need to focus." This is a one-person project that's being honest about capacity.

**The libGDX Connection:** Mario Zechner created libGDX, the most popular open-source Java game framework (22K+ stars). The parallels are visible: both projects use a layered abstraction over platform-specific backends (OpenGL/Vulkan for libGDX, LLM APIs for pi), both ship a custom rendering system (scene2d for libGDX, pi-tui for pi), and both maintain strict package dependency discipline. The man builds things the same way regardless of domain.

**Armin and Daxnuts:** Look in `packages/coding-agent/src/modes/interactive/components/` — there are files named `armin.ts` and `daxnuts.ts`. These are hidden TUI components. Easter eggs for the Discord community.

---

## Verification Log

<details>
<summary>Fact-check log (click to expand)</summary>

| Claim | Verification Method | Result |
|-------|-------------------|--------|
| 32,049 stars | GitHub API (`/repos/badlogic/pi-mono`) | ✅ Verified |
| 3,488 forks | GitHub API | ✅ Verified |
| 147,444 LOC | PowerShell line count across 583 .ts files | ✅ Verified |
| First commit 2025-08-09 | GitHub API `created_at` | ✅ Verified |
| Latest release v0.65.2 | npm registry `@mariozechner/pi-coding-agent` | ✅ Verified |
| MIT License | LICENSE file | ✅ Verified |
| 7 packages in monorepo | `packages/` directory listing | ✅ Verified (ai, agent, coding-agent, tui, web-ui, mom, pods) |
| pi-ai: 37,165 lines | Package-level line count | ✅ Verified |
| pi-agent-core: 3,152 lines | Package-level line count | ✅ Verified |
| pi-coding-agent: 69,493 lines | Package-level line count | ✅ Verified |
| pi-tui: 17,659 lines | Package-level line count | ✅ Verified |
| pi-web-ui: 13,808 lines | Package-level line count | ✅ Verified |
| pi-mom: 3,578 lines | Package-level line count | ✅ Verified |
| pi-pods: 1,546 lines | Package-level line count | ✅ Verified |
| Stealth mode `claudeCodeVersion = "2.1.75"` | `packages/ai/src/providers/anthropic.ts:68` | ✅ Verified |
| Tool names list (17 tools) | `packages/ai/src/providers/anthropic.ts:72-89` | ✅ Verified |
| Steering/followUp queue in Agent class | `packages/agent/src/agent.ts:110-114` | ✅ Verified |
| `armin.ts` and `daxnuts.ts` exist | Directory listing of `modes/interactive/components/` | ✅ Verified |
| `shittycodingagent.ai` URL | README.md anchor tag | ✅ Verified |
| Lazy provider loading pattern | `packages/ai/src/providers/register-builtins.ts` | ✅ Verified |
| 10 API types (KnownApi union) | `packages/ai/src/types.ts:3-13` | ✅ Verified |
| AgentSession class >1500 lines | `packages/coding-agent/src/core/agent-session.ts` full read | ✅ Verified |
| libGDX creator (Mario Zechner) | GitHub profile `badlogic` + libGDX repo | ✅ Known fact |

</details>

---

*Part of [awesome-ai-anatomy](https://github.com/NeuZhou/awesome-ai-anatomy) — source-level teardowns of how production AI systems actually work.*
