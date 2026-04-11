# OpenAI Codex CLI: An AI That Reviews Its Own AI, 549K Lines of Rust, and 17K Lines of Sandbox Code

> OpenAI built a coding agent in Rust. Not TypeScript, not Python - Rust. 549K lines across 88 crates. The wildest part isn't the language choice though. It's that they built a second AI whose entire job is to look at what the first AI wants to do and decide if it's safe. An AI reviewing an AI. If that sounds circular, well, it kind of is - and that's what makes it interesting.

> **TL;DR:**
> - **What:** OpenAI's open-source Rust coding agent - 549K lines, 88 crates, native OS sandboxing on macOS/Linux/Windows
> - **Why it matters:** The Guardian pattern (a second AI risk-scores every action, auto-approves below threshold) is basically Constitutional AI applied to tool use. Plus 17K lines of sandbox code across 3 platforms - more than most entire CLI tools
> - **What you'll learn:** How queue-pair architectures decouple agent brains from UIs, why `mkdir`-based locks work, and what 8,870 lines of Windows ACL manipulation looks like

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://github.com/openai/codex/blob/main/LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/openai/codex/blob/main/docs/contributing.md)

> This analysis is based on the public open-source repository at [github.com/openai/codex](https://github.com/openai/codex).

## Why Should You Care?

Here's the thing that got me: Codex CLI has an AI that reviews its own AI's actions before executing them. Called "Guardian," it takes the tool call the main agent wants to run, sends it to a *different* model instance (gpt-5.4), gets back a risk score from 0-100, and auto-approves if the score is under 80. If the second model can't decide in 90 seconds, it defaults to "deny."

This is Anthropic's [Constitutional AI](https://arxiv.org/abs/2212.08073) idea - AI self-review driven by explicit principles - except applied to runtime tool execution instead of training-time alignment. Constitutional AI has the model critique and revise its own outputs against a set of rules. Guardian does the same thing but for `rm -rf` and `curl` commands, in real-time, before they run.

(Whether an AI is fully qualified to judge another AI's safety is an open and fascinating question. What's clear is that the engineering execution here is impressive.)

The other number that jumped out: **17,237 lines of sandbox code**. Three platforms, three completely different OS security APIs, no Docker dependency. For context, the entire Helix terminal editor is ~80K lines. Codex spends a fifth of a whole editor just on sandboxing.

## At a Glance

| Metric | Value |
|--------|-------|
| Repository | [openai/codex](https://github.com/openai/codex) |
| Language | Rust (549K LoC), TypeScript SDK |
| Files | 1,389 `.rs` files (162 test files) |
| Workspace Crates | 88 |
| Framework | Tokio async runtime, Ratatui TUI, Clap CLI |
| Build System | Cargo + Bazel (dual) |
| License | Apache-2.0 |
| Sandbox | Seatbelt (macOS), Landlock+bubblewrap+seccomp (Linux), Restricted Token + ACL (Windows) |
| Data as of | April 2026 |

---

## Characteristics

| Dimension | Description |
|-----------|-------------|
| Architecture | Queue-pair async event system - cleanly separating action/perception channels. 88 Rust workspace crates, dual Cargo+Bazel build |
| Code Organization | 549K LOC Rust across 1389 files, 162 test files, strict crate boundaries with codex-core (176K), codex-tui (112K), codex-cli (5K) |
| Security Approach | 4-layer defense-in-depth covering the critical surfaces: approval → Guardian AI → OS sandbox → network proxy |
| Context Strategy | Two-phase memory extraction: per-rollout raw extraction then cross-rollout consolidation. A more streamlined approach than Claude Code's 4-layer cascade -- it'll be interesting to see how each evolves |
| Documentation | Crate-level docs, architecture decision records. Cross-crate architecture rewards reading the code directly (a high-level design doc would be a welcome future addition) |

## Table of Contents

- [At a Glance](#at-a-glance)
- [Architecture Overview](#architecture-overview)
- [Core Module Analysis](#core-module-analysis)
  - [codex-core - The Brain](#codex-core--the-brain-176k-lines)
  - [codex-tui - Terminal UI](#codex-tui--terminal-ui-112k-lines)
  - [codex-cli - Entry Point](#codex-cli--entry-point-5k-lines)
  - [Tool System - codex-tools + core/tools](#tool-system--codex-tools--coretools)
  - [Sandbox Stack - Three-Platform Security](#sandbox-stack--three-platform-security)
  - [Hook System - Lifecycle Interception](#hook-system--lifecycle-interception)
  - [Skills System - Markdown-Driven Extensions](#skills-system--markdown-driven-extensions)
  - [Protocol - The Contract Layer](#protocol--the-contract-layer)
  - [MCP Integration - Model Context Protocol](#mcp-integration--model-context-protocol)
  - [Exec & Exec-Server - Process Execution](#exec--exec-server--process-execution)
  - [Guardian - AI Reviews AI](#guardian--ai-reviews-ai)
  - [Network Proxy - MITM for Safety](#network-proxy--mitm-for-safety)
  - [App Server - Multi-Client Architecture](#app-server--multi-client-architecture)
- [Design Decisions (ADR)](#design-decisions-adr)
- [Comparison with Claude Code](#comparison-with-claude-code)
- [Security Analysis](#security-analysis)
- [Code Metrics](#code-metrics)
- [Stuff Worth Stealing](#stuff-worth-stealing)
- [Limitations & Technical Debt](#limitations--technical-debt)
- [Key Takeaways](#key-takeaways)

---

## Architecture Overview

![Architecture](architecture.png)

The core idea: Codex CLI is a **queue-pair** system. The `Codex` struct exposes a `Sender<Submission>` and a `Receiver<Event>`. Push operations in, get events out. Model calls, tool execution, sandbox management, approval flows - all of it happens inside this async loop.

If you think about agent architectures needing a clear separation between the "cognition core" and the "action interfaces" - as the [CoALA paper](https://arxiv.org/abs/2309.02427) (Cognitive Architectures for Language Agents) argues - this is exactly that. The TUI, App Server, and MCP Server are just different action interfaces submitting to the same cognition core.

(The Codex team might have just wanted clean async boundaries. But the structural similarity to CoALA is hard to ignore.)

---

## Core Module Analysis

### codex-core - The Brain (176K lines)

**Path:** `codex-rs/core/`

The biggest crate, and one the team is actively managing the growth of -- their `AGENTS.md` says "**resist adding code to codex-core!**" in bold. At 176K lines, the crate's gravity speaks to how central it is.

The central type is `Codex` in `codex-rs/core/src/codex.rs` -- a 7,786-line file. Their own guideline targets 500-line modules, so this file clearly serves as the gravitational center of the whole system.

What it does:

1. **Session lifecycle** - `spawn()` sets up auth, config, skills, plugins, MCP connections, then enters the main submission loop
2. **Turn execution** - Each message: build context → call model → dispatch tool calls → loop until done
3. **Compaction** - When context gets too big, summarize and compress
4. **Sub-agent orchestration** - Can spawn child `Codex` instances for multi-agent workflows

```
Codex::spawn() {
  ① Initialize auth, config, skills, plugins, MCP
  ② Enter submission loop:
    match submission {
      Op::UserInput → start_turn()
      Op::Compact → run_compact_task()
      Op::Interrupt → cancel current turn
      Op::Shutdown → graceful exit
    }
  ③ start_turn():
    - Build context (ContextManager + initial injections)
    - Stream from ModelClient (SSE or WebSocket)
    - For each response item:
      - Text → emit to UI
      - ToolCall → dispatch via ToolRouter
      - Tool results → append to context → next model call
    - No tools? → turn complete
}
```

This is a standard think → act → observe → think again loop wrapped in Rust's async machinery. Nothing conceptually novel - the novelty is in what wraps around it.

**Key sub-modules within core:**

| Module | Lines | Purpose |
|--------|-------|---------|
| `tools/` | ~8K | Tool routing, parallel execution, sandbox orchestration |
| `context_manager/` | ~1.5K | Token tracking, history management, truncation |
| `compact.rs` + `compact_remote.rs` | ~500 | Context window compaction |
| `guardian/` | ~1.5K | AI-powered auto-approval for dangerous actions |
| `memories/` | ~2K | Two-phase memory extraction from past sessions |
| `agent/` | ~1K | Multi-agent registry over sub-threads |
| `plugins/` | ~3K | Plugin discovery, marketplace, injection |
| `config/` | ~2K | Layered configuration, permissions, schema |
| `unified_exec/` | ~2K | PTY-backed persistent shell processes |

**The `Codex` struct (simplified):**

```rust
// codex-rs/core/src/codex.rs
pub struct Codex {
    tx_sub: Sender<Submission>,   // push operations
    rx_event: Receiver<Event>,    // receive events
    agent_status: watch::Receiver<AgentStatus>,
    session: Arc<Session>,        // shared state
    session_loop_termination: Shared<BoxFuture<'static, ()>>,
}
```

The `Session` arc holds config, auth, tool router, approval store, context manager, skills, hooks, network proxy, feature flags, and more. It's a central coordination hub -- they're aware of the coupling (there's a partial `SessionServices` extraction underway), and when a turn needs access to 40+ things, this kind of aggregation is a pragmatic choice.

---

### codex-tui - Terminal UI (112K lines)

**Path:** `codex-rs/tui/`

Built on [Ratatui](https://ratatui.rs/) + [Crossterm](https://github.com/crossterm-rs/crossterm). Full chat interface with:

- Markdown rendering, syntax highlighting (via `syntect`), diff display
- Approval dialogs, selection views, MCP elicitation forms
- File search overlay (fuzzy matching via `nucleo`)
- Multiple agent tabs for multi-agent workflows
- Streaming with frame rate limiting
- Clipboard via `arboard`

`app.rs` is the main event loop -- **10,851+ lines**, the largest single file in the project. Their `AGENTS.md` calls it a "high-touch file" where new functionality should go into separate modules. A natural focal point for future modularization.

112K lines for a terminal UI. For reference, the entire Helix editor is ~80K lines. Ratatui is imperative -- you draw each frame explicitly, which means more code for complex UIs than you'd write with React/Ink. The investment reflects just how rich the interactive experience is.

---

### codex-cli - Entry Point (5K lines)

**Path:** `codex-rs/cli/src/main.rs`

A Clap-based multi-tool dispatcher. `MultitoolCli` routes to:

- **Default** → launches TUI
- `exec` → headless single-prompt mode
- `mcp` → starts as an MCP server
- `app` → launches desktop app (macOS only)
- `login` / `logout` → auth management
- `config` → configuration editing
- `review` → code review mode
- `landlock` / `seatbelt` / `windows-sandbox` → sandbox debugging subcommands

The `arg0` crate enables symlink-based dispatch: if the binary is invoked as `codex-linux-sandbox`, it routes directly to the sandbox helper. One binary, multiple personalities.

---

### Tool System - codex-tools + core/tools

**Paths:** `codex-rs/tools/` (definitions) + `codex-rs/core/src/tools/` (runtime)

Three-layer architecture where the model decides *when* to call a tool, *what* to pass, and *how* to use the result. The routing is externalized into a typed system:

1. **Tool Definitions** (`codex-tools/`) - Pure data. `ToolDefinition` = name + description + JSON schema + type. No execution logic.
2. **Tool Router** (`core/tools/router.rs`) - Maps tool names to handlers. Builds specs from config, MCP tools, dynamic tools, and discoverable tools.
3. **Tool Handlers** (`core/tools/handlers/`) - Actual execution. Each tool type implements `ToolHandler`.

```rust
// codex-rs/core/src/tools/registry.rs
pub trait ToolHandler: Send + Sync {
    type Output: ToolOutput + 'static;
    fn kind(&self) -> ToolKind;
    fn is_mutating(&self, inv: &ToolInvocation) -> bool;
    fn handle(&self, invocation: ToolInvocation) -> BoxFuture<Result<Self::Output>>;
    fn pre_tool_use_payload(&self, ...) -> Option<PreToolUsePayload>;
    fn post_tool_use_payload(&self, ...) -> Option<PostToolUsePayload>;
}
```

**Available tool types:**

| Tool | Handler | Notes |
|------|---------|-------|
| `shell` / `shell_command` | `ShellHandler` | Classic exec or `zsh_fork` backend |
| `apply_patch` | `ApplyPatchHandler` | Unified diff application, JSON or freeform |
| `agent_spawn` / `agent_wait` | `MultiAgentsV2` | Sub-agent lifecycle management |
| `js_repl` | `JsReplHandler` | Persistent Node.js kernel (experimental) |
| `code_mode` | `CodeModeHandler` | V8-backed JavaScript sandbox (experimental) |
| MCP tools | `McpHandler` | Delegated to MCP server connections |
| Dynamic tools | `DynamicHandler` | Runtime-registered tools |
| `tool_search` / `tool_suggest` | Discoverable | Lazy tool discovery for large tool sets |
| `request_user_input` | `RequestUserInputHandler` | Pause for human input |
| `request_permissions` | `RequestPermissionsHandler` | Runtime permission elevation |
| `view_image` | `ViewImageHandler` | Image content display |

The **Tool Orchestrator** (`core/tools/orchestrator.rs`) is where it gets interesting. Every tool call flows through:

```
Approval → Sandbox Selection → Execution Attempt → Retry (on sandbox denial)
```

Progressive sandbox escalation: if a sandboxed execution fails due to permission denial, retry with looser constraints without re-prompting for approval. The approval was cached.

**Parallel Execution** (`core/tools/parallel.rs`) - Uses `RwLock<()>`: read-only tools get a read lock (parallel), mutating tools get a write lock (exclusive). Simpler than Claude Code's approach but does the job.

---

### Sandbox Stack - Three-Platform Security

**Paths:** `codex-rs/sandboxing/`, `codex-rs/linux-sandbox/`, `codex-rs/windows-sandbox-rs/`

17,237 lines of sandbox code. This is where most of the paranoia budget went.

An agent that can run arbitrary shell commands is an agent that can do real damage. "Excessive Agency" is consistently flagged as a top concern for AI agents -- and rightly so. Research has shown that GPT-4 agents can autonomously exploit vulnerabilities without prior knowledge of them.

Codex's answer: don't just tell the agent what it can't do. Make the OS enforce it.

#### macOS - Seatbelt (`sandbox-exec`)

**File:** `sandboxing/src/seatbelt.rs` (~530 lines)

Uses Apple's `sandbox-exec` with custom SBPL policies:

- `seatbelt_base_policy.sbpl` - Default denials for process control, IPC, system modifications
- `seatbelt_network_policy.sbpl` - Network access rules
- Dynamic path allowlists for workspace access

Security detail: Only invokes `/usr/bin/sandbox-exec` (hardcoded path), never from `$PATH`. Prevents path injection attacks.

#### Linux - Landlock + bubblewrap + seccomp

**File:** `linux-sandbox/src/` (~4,736 lines)

Three-layer defense:

1. **Landlock** - Kernel-level filesystem access restrictions (Linux 5.13+)
2. **bubblewrap (bwrap)** - User-namespace filesystem isolation. They vendor the bwrap binary
3. **seccomp** - System call filtering via `seccompiler`

The Linux sandbox is a separate binary invoked via arg0 dispatch. It sets `PR_SET_NO_NEW_PRIVS`, applies seccomp filters, wraps commands in bubblewrap namespaces with read-only bind mounts, and injects proxy routing.

#### Windows - Restricted Tokens + ACLs

**File:** `windows-sandbox-rs/src/` (~8,870 lines - the largest sandbox!)

The most complex one because Windows doesn't have a unified sandboxing API. They had to build it from pieces:

- **Restricted tokens** - Strip privileges from the process token
- **DACL manipulation** - Deny write access outside workspace
- **Private desktop** - Isolate from user's desktop (blocks clipboard/keyboard snooping)
- **ConPTY** - Windows pseudo-terminal for I/O capture
- **DPAPI** - Data Protection API for secret encryption
- **Elevated helper** - Separate admin-rights process for sandbox setup, talks via named pipes

macOS: 530 lines. Linux: 4,736 lines. Windows: 8,870 lines. The asymmetry tells you everything about the state of OS-level sandboxing APIs.

#### Sandbox Manager

**File:** `sandboxing/src/manager.rs`

Unified API, one function:

```rust
pub fn get_platform_sandbox(windows_sandbox_enabled: bool) -> Option<SandboxType> {
    if cfg!(target_os = "macos") { Some(SandboxType::MacosSeatbelt) }
    else if cfg!(target_os = "linux") { Some(SandboxType::LinuxSeccomp) }
    else if cfg!(target_os = "windows") {
        if windows_sandbox_enabled { Some(SandboxType::WindowsRestrictedToken) }
        else { None }
    } else { None }
}
```

---

### Hook System - Lifecycle Interception

**Path:** `codex-rs/hooks/` (~4,939 lines)

Five lifecycle events:

| Event | When | Can Block? |
|-------|------|-----------|
| `session_start` | Session initialization | Yes |
| `user_prompt_submit` | Before prompt goes to model | Yes (can modify) |
| `pre_tool_use` | Before a tool runs | Yes (can deny/override) |
| `post_tool_use` | After a tool completes | No (informational) |
| `stop` | Session termination | No |

Hooks are shell commands in `hooks.json` that receive JSON on stdin and return JSON on stdout. Like Git hooks but with structured I/O. The `pre_tool_use` hook can approve, deny, or modify a tool call before execution - which makes it a user-defined extension point for the security model.

---

### Skills System - Markdown-Driven Extensions

**Paths:** `codex-rs/skills/` + `codex-rs/core-skills/`

Skills are markdown files (`SKILLS.md`) injected into the model's system prompt. Not code - prompt engineering packaged as a file convention. Think of it as a skill library where capabilities are stored as descriptions and retrieved by matching, but at the prompt level instead of the code level.

```rust
// codex-rs/core-skills/src/model.rs
pub struct SkillMetadata {
    pub name: String,
    pub description: String,
    pub short_description: Option<String>,
    pub interface: Option<SkillInterface>,
    pub dependencies: Option<SkillDependencies>,
    pub policy: Option<SkillPolicy>,
    pub path_to_skills_md: PathBuf,
    pub scope: SkillScope,
}
```

Skills can declare dependencies (MCP servers, env vars, tools), interface metadata (display name, icon, brand color), and policy (which products, whether implicit invocation allowed).

System skills are embedded at compile time via `include_dir!` and extracted to `CODEX_HOME/skills/.system` on first run, with fingerprint-based cache invalidation.

---

### Protocol - The Contract Layer

**Path:** `codex-rs/protocol/` (~13K lines)

The protocol crate defines all the typed interfaces. This is the single most important crate for understanding the system:

- **`Event`** / **`Submission`** - Bidirectional queue-pair message types
- **`ResponseItem`** / **`ResponseInputItem`** - Conversation history items
- **`SandboxPolicy`** - Security policy types
- **`AskForApproval`** - Permission level enum: `Never`, `OnFailure`, `UnlessSafe`, `Always`
- **`TurnItem`** - Individual items within a model turn

Pure data - no logic, no I/O. Every crate depends on protocol; protocol depends on nothing significant. Textbook dependency inversion.

---

### MCP Integration - Model Context Protocol

**Paths:** `codex-rs/codex-mcp/` (client) + `codex-rs/mcp-server/` (server) + `codex-rs/rmcp-client/` (low-level)

Codex integrates MCP in **both directions**:

1. **As MCP Client** - Connects to external MCP servers, aggregates their tools into the router
2. **As MCP Server** - Exposes Codex itself as an MCP tool provider

Tool names from MCP servers get namespaced: `"<server_name>__<tool_name>"` (double-underscore delimiter). The elicitation protocol lets MCP servers request interactive user input during tool calls - bidirectional communication that most frameworks don't have.

Worth noting: MCP is becoming a new area to watch for injection attacks. The namespacing helps, and further trust mechanisms could strengthen it. More on that in the security section.

---

### Exec & Exec-Server - Process Execution

**Paths:** `codex-rs/exec/` + `codex-rs/exec-server/`

Two modes:

1. **`codex exec`** - Headless single-prompt execution. Run a prompt, stream tool calls, get result. Supports `--json` for structured JSONL output.
2. **`exec-server`** - Persistent daemon that manages sandboxed environments. Provides RPC for process spawning, filesystem ops, PTY allocation, output streaming.

The exec-server enables remote execution - Codex can run commands on a different machine while the core runs locally. This is the foundation for cloud-based execution (there are `cloud-tasks` crates in the workspace).

---

### Guardian - AI Reviews AI

**Path:** `codex-rs/core/src/guardian/` (~1,500 lines)

This is the module I spent the most time staring at. When a tool call needs approval, Guardian can auto-approve or deny it by asking a second AI:

```rust
// codex-rs/core/src/guardian/mod.rs
const GUARDIAN_PREFERRED_MODEL: &str = "gpt-5.4";
const GUARDIAN_REVIEW_TIMEOUT: Duration = Duration::from_secs(90);
const GUARDIAN_APPROVAL_RISK_THRESHOLD: u8 = 80;
```

How it works:
1. Reconstructs a compact transcript (limited to `GUARDIAN_MAX_MESSAGE_TRANSCRIPT_TOKENS`)
2. Sends a structured review request to gpt-5.4 (a different model instance)
3. Gets back a `GuardianAssessment`: `risk_level`, `risk_score` (0-100), `rationale`, `evidence`
4. Auto-approves if `risk_score < 80`, denies otherwise
5. Fails closed - timeout, parse error, or any exception = deny

The connection to [Constitutional AI (Bai et al., 2022)](https://arxiv.org/abs/2212.08073) is direct. Constitutional AI has the model generate a response, then critique it against a set of principles, then revise. Guardian does the same thing: generate an action plan, have a second model critique it against safety principles, proceed only if it passes. The "constitution" here is implicit in the Guardian's system prompt rather than an explicit principle list, which I think is a missed opportunity - a declarative rule set would be easier to audit and update.

There's an inherent circularity here that's intellectually fascinating. The Guardian AI is made by the same company as the agent AI. If there's a systematic blind spot in one, it could exist in the other. Safety training is an active area of research -- which means an external Guardian using the same family of models has correlated strengths. It adds a meaningful layer of protection, and it'll be interesting to see how the technique evolves as models diversify.

---

### Network Proxy - MITM for Safety

**Path:** `codex-rs/network-proxy/` (~7,800 lines)

Full MITM proxy that intercepts all network traffic from sandboxed processes:

- HTTP proxy with TLS interception
- SOCKS5 proxy support
- Domain-based allowlist/blocklist
- Per-request policy decisions
- Audit metadata for blocked requests
- Certificate generation for TLS interception

Injected via `HTTP_PROXY`/`HTTPS_PROXY` env vars. On Linux, the sandbox helper routes all traffic through it. Gives Codex full visibility and control over network calls from AI-generated commands.

---

### App Server - Multi-Client Architecture

**Path:** `codex-rs/app-server/` (~56K lines)

JSON-RPC server with stdio and WebSocket transports. Handles:

- Thread management (create, resume, list, subscribe)
- Turn lifecycle (start, interrupt, subscribe to events)
- Plugin management (install, list, uninstall at runtime)

This is what makes the desktop app possible - same core, different frontend via WebSocket.

---

## Design Decisions (ADR)

### Why Rust Instead of TypeScript?

| Factor | Codex CLI (Rust) | Claude Code (TypeScript) |
|--------|------------------|--------------------------|
| **Cold start** | ~50ms | ~200ms (Bun) |
| **Memory** | ~20MB baseline | ~100MB+ |
| **Sandbox depth** | Native OS APIs (seccomp, Landlock, Seatbelt) | Shells out to `sandbox-exec` |
| **Distribution** | Single static binary | npm install, needs Bun |
| **Type safety** | Compile-time | Zod runtime validation |
| **Dev speed** | Slower, longer compiles | Faster iteration |
| **Ecosystem** | Fewer AI libraries | Rich npm ecosystem |
| **Concurrency** | Zero-cost async, no GC | Event loop, occasional GC |

The real reason: they wanted the sandbox *inside* the agent, not bolted on. Rust's FFI lets you call `seccomp(2)`, `landlock_add_rule(2)`, and Windows ACL APIs directly. In TypeScript you'd need native addons per platform -- harder to distribute, and the addons themselves become security considerations.

### Why This Sandbox Architecture?

17K+ lines of sandbox code + 8K for the network proxy. That's a big bet.

**What they could've done:** Docker. What Cursor and some cloud agents use.

**Why they didn't:**
1. Docker adds 2-5 second startup latency per command
2. Docker Desktop licensing on macOS
3. Can't easily sandbox network at the domain level inside Docker
4. Corporate machines often can't install Docker

Massive implementation effort, but zero external dependencies and sub-100ms overhead per command.

### Why a Queue-Pair?

The `Sender<Submission>` / `Receiver<Event>` design is unusual for agents. Most use direct function calls. The benefits:

1. **Multiple frontends** - TUI, App Server, MCP Server all submit to the same queue
2. **Backpressure** - Bounded channel (`SUBMISSION_CHANNEL_CAPACITY = 512`)
3. **Clean shutdown** - Drop the sender, receiver drains, session exits
4. **Testability** - Feed scripted submissions, assert on events

This kind of separation between internal cognition and external interfaces is exactly what good async architecture looks like. Whether the Codex team was inspired by academic frameworks or arrived at it independently, the result is the same - clean boundaries that enable multi-surface deployment.

---

## Comparison with Claude Code

| Dimension | Codex CLI | Claude Code |
|-----------|-----------|-------------|
| **Language** | Rust (549K LoC) | TypeScript (510K LoC) |
| **Runtime** | Native binary | Bun |
| **UI Framework** | Ratatui (imperative) | React/Ink (declarative) |
| **Agentic Loop** | Queue-pair (`Submission` → `Event`) | Single `while(true)` in `query.ts` |
| **Tool Execution** | Trait-based `ToolHandler` + `ToolOrchestrator` | `buildTool()` factory functions |
| **Sandbox** | Native OS APIs (3 platforms, 17K LoC) | macOS `sandbox-exec` only |
| **Windows Support** | Full (with native sandbox) | Partial (WSL recommended) |
| **Context Management** | Inline/remote compaction | 4-layer cascade (SNIP → Microcompact → COLLAPSE → Autocompact) |
| **Auto-Approval** | Guardian AI review (risk scoring) | Implicit yes/no from permission mode |
| **Network Control** | Full MITM proxy | None |
| **Multi-Agent** | Native sub-thread spawning | `Agent` tool spawning |
| **MCP** | Both client + server | Client only |
| **Memory** | Two-phase extraction + consolidation | `.claude/` directory persistence |

The philosophical split: Claude Code trusts the model and sandboxes loosely. Codex CLI verifies everything and sandboxes tightly.

Claude Code optimizes for developer velocity - TypeScript, single-file loops, fast iteration. Accepts complexity in one file to keep the mental model simple.

Codex CLI optimizes for security and correctness - Rust types, native sandboxing, protocol types, Guardian review. Accepts complexity in module count to keep each module focused.

---

## Security Analysis

### Threat Model

Four layers of defense:

```
Layer 1: Approval Policy (user consent)
  ↓
Layer 2: Guardian AI Review (automated risk scoring)
  ↓
Layer 3: OS Sandbox (filesystem + process isolation)
  ↓
Layer 4: Network Proxy (traffic interception + domain filtering)
```

This maps well to what the security literature recommends. Layered defense is essential because any single layer can be bypassed. Benchmarks consistently show that SOTA LLMs fail security tests even without active attacks, let alone sophisticated ones.

### Approval Policies

```rust
pub enum AskForApproval {
    Never,       // Full auto (dangerous)
    OnFailure,   // Auto-approve, ask on failure
    UnlessSafe,  // Auto-approve known-safe commands
    Always,      // Always ask (safest)
}
```

`is_known_safe_command()` in `codex-shell-command` maintains an allowlist of read-only operations (`cat`, `ls`, `grep`, etc.).

### Attack Surface

| Vector | Mitigation | Something to Watch |
|--------|-----------|---------------|
| Prompt injection in tool output | Hook system (`pre_tool_use`) | Model may still be influenced |
| Malicious command execution | Sandbox + approval flow | Sandbox escape (OS-level vuln) |
| Network exfiltration | MITM proxy + domain allowlist | DNS tunneling, steganography |
| File system escape | Landlock/Seatbelt path restrictions | Symlink race conditions |
| Supply chain (MCP servers) | Tool name namespacing | Malicious server returns bad results |
| Memory injection | Model-summarized, not raw | Poisoned summaries (an active area of research) |
| Privilege escalation | `PR_SET_NO_NEW_PRIVS`, restricted tokens | Kernel vulns |

### Areas for Future Growth

1. **Tool output sanitization** -- Guardian reviews actions *before* execution, and an interesting next step would be filtering outputs *after* execution too. A command could return output containing prompt injection that steers the model's next action. This is an active area of research in agent security that several teams are exploring.

2. **Sandbox escape detection** -- Failed sandbox operations return errors, and adding proactive alerts would strengthen the model further. Runtime monitoring for unexpected network connections or file access outside allowed paths is a natural extension of the existing security layers.

3. **MCP server attestation** -- Currently delegates trust to the connection layer. Certificate pinning or signed tool manifests could add another level of confidence, especially as the MCP ecosystem grows.

---

## Code Metrics

### Lines of Code by Module

| Module | Lines | % of Total |
|--------|-------|-----------|
| `core` | 176,101 | 32.1% |
| `tui` | 111,805 | 20.4% |
| `app-server` | 56,207 | 10.2% |
| `app-server-protocol` | 16,154 | 2.9% |
| `protocol` | 13,423 | 2.4% |
| `state` | 11,213 | 2.0% |
| `tools` | 8,953 | 1.6% |
| `windows-sandbox-rs` | 8,870 | 1.6% |
| `network-proxy` | 7,806 | 1.4% |
| `codex-api` | 7,377 | 1.3% |
| `exec` | 7,194 | 1.3% |
| `login` | 6,868 | 1.3% |
| `config` | 6,097 | 1.1% |
| `rollout` | 6,098 | 1.1% |
| `otel` | 5,102 | 0.9% |
| `cli` | 5,097 | 0.9% |
| `exec-server` | 4,951 | 0.9% |
| `hooks` | 4,939 | 0.9% |
| `linux-sandbox` | 4,736 | 0.9% |
| All others | ~83K | ~15% |
| **Total** | **548,910** | **100%** |

### Workspace Crate Count

88 crates. Claude Code: ~1 package. Aider: ~1 package.

88 is ambitious -- and deliberate. Benefits: compile-time dependency boundaries, parallel compilation, forced API design. Cost: 88 `Cargo.toml` files, complex deps, and a `MODULE.bazel.lock` file that's 1.2MB. It's an investment in architectural rigor that pays off at scale.

### Test Coverage

- 162 `*_tests.rs` files (~12% of file count)
- Colocated tests (Rust convention)
- Snapshot testing via `insta`
- `core_test_support` and `mcp_test_support` harness crates

---

## Stuff Worth Stealing

### 1. The Guardian Pattern - AI Auto-Approval via Second Opinion

Use a separate AI model to risk-score actions in real-time. Reduces approval fatigue without going full YOLO:

```rust
struct GuardianAssessment {
    risk_level: RiskLevel,  // Low, Medium, High, Critical
    risk_score: u8,         // 0-100
    rationale: String,
    evidence: Vec<GuardianEvidence>,
}
// Auto-approve if risk_score < 80
```

This is Constitutional AI applied to runtime actions. If you're building any agent that executes tools, this pattern beats both "always ask" and "never ask."

**~200 lines** to implement a basic version.

### 2. Queue-Pair Architecture for Agent Systems

Decouple agent core from frontends via typed channels:

```rust
struct Agent {
    tx: Sender<Command>,
    rx: Receiver<Event>,
}
```

Steal this if your agent needs to work as a CLI, API, desktop app, or IDE extension without duplicating the core logic. Clean separation between cognition and interfaces is what makes multi-surface agents possible.

### 3. Progressive Sandbox Escalation

Try the tightest sandbox first. If denied, retry looser - without re-asking for permission:

```
Attempt 1: Full sandbox (filesystem + network restricted)
  → Permission denied?
Attempt 2: Filesystem sandbox only
  → Still fails?
Attempt 3: Report failure to model for alternative approach
```

### 4. Arg0-Based Multi-Binary Dispatch

One binary, multiple personalities based on executable name:

```rust
fn main() {
    arg0_dispatch_or_else(|paths| {
        if paths.matches("codex-linux-sandbox") { sandbox::run_main() }
        else { cli::run_main() }
    })
}
```

Neat trick for Rust projects that need helper binaries without distribution headaches.

### 5. Network Proxy as Security Layer

Instead of blocking network at the syscall level (platform-specific and hard to maintain), run a local MITM proxy. You get domain-level visibility, request logging, and policy enforcement at the application layer. More work to set up, and way more debuggable.

### 6. Two-Phase Memory Extraction

Phase 1 (per-rollout): Extract raw memories from each session independently, in parallel.
Phase 2 (consolidation): Merge and deduplicate across rollouts.

Avoids the "summarize everything at once" problem that degrades as session count grows.

### 7. Feature Flag Lifecycle

```rust
pub enum Stage {
    UnderDevelopment,
    Experimental { name, description, announcement },
    Stable,
    Deprecated,
    Removed,
}
```

Prevents the "500 undocumented boolean flags" problem.

---

## Limitations & Technical Debt

### 1. The codex-core Growth Challenge

176K lines in one crate. `codex.rs` alone = 7,786 lines. `app.rs` in TUI = 10,851 lines. The team has clear aspirations to modularize further ("resist adding to core"), and this will be an interesting architectural evolution to watch.

Impact: changing one line recompiles 176K lines. In Rust, incremental builds for `codex-core` alone take 30-60 seconds.

### 2. Windows Sandbox Complexity

macOS sandbox: 530 lines. Linux: 4,736. Windows: 8,870. Windows doesn't have a unified sandboxing API, so the team impressively stitched together restricted tokens, ACLs, private desktops, ConPTY, DPAPI, and an elevated helper process. The `windows_sandbox_enabled` flag defaults to off -- the testing surface for all that Windows-specific code is something to watch as the project matures.

### 3. Feature Flag Richness

88+ flags, many `Experimental`. Testing all combinations is a real challenge. Some flags interact in non-obvious ways (`CodeModeOnly` conflicts with `ShellTool`). A `conflicts_with` field would be a natural next step -- I'm curious whether the team is already tracking this.

### 4. The Central Coordination Hub

`Session` struct holds 40+ fields, passed as `Arc<Session>` everywhere. Testing anything means constructing a full Session. The team is already working on this (there's a partial `SessionServices` extraction), and the direction is promising.

### 5. TUI Investment

112K lines for a terminal UI. Helix editor: ~80K for a full code editor. The code-to-feature ratio reflects how rich the interactive experience is -- and there are likely abstraction opportunities that could reduce this over time.

### 6. Dual Build System

Both Cargo and Bazel maintained. The `MODULE.bazel.lock` is 1.2MB. Every dependency change requires `just bazel-lock-update`. Worth keeping in mind for new contributors navigating the build toolchain.

### 7. Streamlined Compaction

Claude Code has a 4-layer compaction cascade (HISTORY_SNIP -> Microcompact -> CONTEXT_COLLAPSE -> Autocompact) with surgical deletion and cache-level editing. Codex takes a more streamlined summarization approach. When context overflows, it summarizes everything -- a simpler strategy that trades granularity for implementation clarity. It'll be interesting to see whether the team adopts more targeted approaches as the project evolves.

---

## Key Takeaways

1. **Rust works for AI agents, but costs ~1.5x the code.** 549K lines of Rust vs 510K of TypeScript for comparable scope. You get native sandbox integration and single-binary distribution. You pay in development velocity.

2. **17K lines of sandbox code is the product.** Most agents treat sandboxing as a checkbox. Codex treats it as the primary feature. In enterprise contexts, this is the selling point.

3. **Guardian is Constitutional AI for tool use.** Having a second AI risk-score actions before execution is the best UX compromise between "approve everything" and "approve nothing." How well it performs depends on the diversity between the reviewing model and the acting model. A strong foundation that will only get better as model families diversify.

4. **Queue-pair architecture makes multi-surface agents possible.** Same core running as CLI, desktop app, MCP server, or cloud worker. If you're building an agent that needs more than one interface, this is the pattern.

5. **88 crates is ambitious.** It enforces architectural boundaries that would otherwise erode. The tradeoff (Bazel complexity, lockfile management) is real. Somewhere around 30-40 crates might hit the sweet spot for most teams, though the 88-crate approach clearly works at OpenAI's scale.

6. **The real bet is trust, not features.** Claude Code has better context management. Codex has better security. The bet is that enterprise buyers will pay for verifiable safety. If that bet is right, those 17K sandbox lines are the best investment in the codebase.

---

## Appendix: File Structure Reference

```
codex-rs/
├── cli/                 # CLI entry point (Clap)
├── tui/                 # Terminal UI (Ratatui)
├── core/                # Core engine
│   ├── src/
│   │   ├── codex.rs     # Main Codex struct (7,786 lines)
│   │   ├── client.rs    # Model API client
│   │   ├── compact.rs   # Context compaction
│   │   ├── tools/       # Tool system
│   │   ├── guardian/     # AI auto-approval
│   │   ├── memories/    # Memory extraction
│   │   ├── context_manager/
│   │   ├── agent/       # Multi-agent registry
│   │   ├── plugins/
│   │   ├── config/
│   │   └── unified_exec/
├── tools/               # Tool definitions (data only)
├── protocol/            # Typed protocol
├── sandboxing/          # Cross-platform sandbox manager
├── linux-sandbox/       # Landlock+bwrap+seccomp
├── windows-sandbox-rs/  # RestrictedToken+ACL
├── hooks/               # Lifecycle hooks
├── skills/              # System skills installer
├── core-skills/         # Skills loader
├── codex-mcp/           # MCP client
├── mcp-server/          # Codex-as-MCP-server
├── exec/                # Headless execution
├── exec-server/         # Remote execution daemon
├── app-server/          # JSON-RPC server
├── network-proxy/       # MITM proxy
├── features/            # Feature flags
├── state/               # SQLite persistence
├── config/              # Config loading
├── login/               # Auth
├── codex-api/           # OpenAI API client
├── rollout/             # Session recording
├── otel/                # OpenTelemetry
└── ... (60+ utility crates)
```

---

*Analysis based on the public [openai/codex](https://github.com/openai/codex) repository (Apache-2.0 license). All code references are to the open-source codebase.*


## Additional Diagrams

![Diagram 1](codex-cli-1.png)
