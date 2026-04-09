# OpenHands/OpenHands: The 70K-Star Agent That's Rewriting Itself While You Watch

> OpenHands is two codebases duct-taped together. The V0 "legacy" agent loop is 1,391 lines of event-driven Python with a 487-line stuck detector. The V1 replacement lives in a separate SDK repo that doesn't exist yet in this tree. Every core file has a deprecation banner dated April 1, 2026. That date has passed. The old code is still running.

## At a Glance

| Metric | Value |
|--------|-------|
| Stars | 70,860 |
| Forks | 8,886 |
| Language | Python (287K lines) + TypeScript (114K lines) |
| Framework | FastAPI (server), LiteLLM (providers), Docker (sandboxing) |
| Total Lines of Code | ~400K |
| License | NOASSERTION (MIT header in LICENSE file) |
| First Commit | 2024-03-13 |
| Originally | OpenDevin — renamed to OpenHands |
| GitNexus Index | 21,157 nodes, 66,716 edges, 1,102 clusters, 300 execution flows |
| Data as of | April 2026 |

OpenHands is a web-based AI agent platform for software development. It runs code in Docker sandboxes, supports 6 different agent types, has 10 different memory condensation strategies, 3 security analyzers, integrations with 7 git platforms, and an enterprise layer with organization management. It was originally called OpenDevin (aiming to build an open-source Devin alternative), rebranded to OpenHands, and the GitHub organization moved from `All-Hands-AI` to `OpenHands` (`OpenHands/OpenHands`).

---

## Overall Rating

| Dimension | Grade | Notes |
|-----------|-------|-------|
| Architecture | B+ | Ambitious multi-agent design with Docker sandboxing; V0/V1 transition creates confusion |
| Code Quality | B | Solid Python with type hints; 287K lines with clear module boundaries but God Object in controller |
| Security | A- | Three-layer security (GraySwan + Invariant + LLM) is the most structured approach in any open-source agent |
| Memory/Context | A | 10 condenser strategies including structured summary and amortized forgetting — best in class |
| Documentation | B- | Code comments are good; architectural docs assume you know the V0/V1 split |
| **Overall** | **B+** | **The condenser system and security architecture are unique in the open-source agent space; the V0/V1 migration debt is the elephant in the room** |

## Architecture

![Architecture](architecture.png)

<details>
<summary>Mermaid source (click to expand)</summary>

```mermaid
graph LR
    subgraph Entry["Entry Points"]
        WebUI["Web UI\n(React + Vite)"]
        CLI["CLI\n(headless mode)"]
        Resolver["Issue Resolver\n(PR/issue automation)"]
    end

    subgraph AppServer["V1 App Server (FastAPI)"]
        ConvMgr["Conversation Manager\n(886 lines)"]
        Routes["Routes\n(82 clusters)"]
        Auth["Auth Layer"]
    end

    subgraph V0Core["V0 Legacy Core (deprecated)"]
        AgentCtrl["AgentController\n(1,391 lines — God Object)"]
        StuckDet["StuckDetector\n(487 lines)"]
        EventStream["EventStream\n(pub/sub event bus)"]
    end

    subgraph Agents["Agent Hub (6 agents)"]
        CodeAct["CodeActAgent\n(primary agent)"]
        Browsing["BrowsingAgent"]
        VisualBrowse["VisualBrowsingAgent"]
        LOC["LOCAgent"]
        ReadOnly["ReadOnlyAgent"]
        Dummy["DummyAgent\n(testing)"]
    end

    subgraph Memory["Memory System"]
        ConvMemory["ConversationMemory"]
        Condenser["Condenser Pipeline\n(10 strategies)"]
    end

    subgraph Security["Security Layer"]
        GraySwan["GraySwan Analyzer\n(Cygnal API)"]
        Invariant["Invariant Analyzer\n(policy engine)"]
        LLMRisk["LLM Risk Analyzer"]
    end

    subgraph Runtime["Runtime Layer"]
        Docker["Docker Runtime"]
        K8s["Kubernetes Runtime"]
        Local["Local Runtime"]
        Remote["Remote Runtime"]
        ActionExec["Action Execution Server\n(in-sandbox)"]
    end

    subgraph Integrations["Git Integrations"]
        GH["GitHub"]
        GL["GitLab"]
        BB["Bitbucket"]
        BBDev["Bitbucket DC"]
        Azure["Azure DevOps"]
        Forgejo["Forgejo"]
    end

    WebUI --> Routes
    CLI --> AgentCtrl
    Resolver --> AgentCtrl
    Routes --> ConvMgr --> AgentCtrl
    AgentCtrl --> EventStream
    AgentCtrl --> StuckDet
    AgentCtrl --> CodeAct
    CodeAct --> ConvMemory --> Condenser
    AgentCtrl --> Security
    AgentCtrl --> Runtime
    Runtime --> ActionExec
    ConvMgr --> Integrations
```

</details>

The architecture has five layers. At the top, three entry points (web UI, CLI, issue resolver) converge on the V1 App Server, which manages conversations and routes them to the V0 Legacy Core. The core is an event-driven system centered on the `AgentController` — a 1,391-line class that orchestrates the agent loop, stuck detection, delegation, and security checks. Agents (primarily CodeActAgent) produce actions that flow through the Memory system (with configurable condensation) and Security layer before reaching the Runtime, which executes commands inside Docker containers.

The most important thing to understand: **this codebase is mid-migration.** Every file in `controller/`, `agenthub/`, `security/`, and `runtime/` has a deprecation banner pointing to a V1 Software Agent SDK. The V1 app server (`app_server/`) is already in this repo with 15,218 lines, but it still delegates to the V0 controller for the actual agent loop. This creates a two-headed architecture where the routing is V1 but the brains are V0.

**Files to reference:**
- `openhands/controller/agent_controller.py` — The 1,391-line God Object (Legacy V0)
- `openhands/controller/stuck.py` — 487-line stuck detection (Legacy V0)
- `openhands/memory/condenser/condenser.py` — Condenser base class and registry
- `openhands/security/grayswan/analyzer.py` — GraySwan security analyzer
- `openhands/server/conversation_manager/standalone_conversation_manager.py` — 886-line V1 conversation manager

---

## Core Innovation


### The Condenser System: 10 Ways to Forget

![Condenser Pipeline](openhands-1.png)

Most agents have one context management strategy (usually "summarize when full" or "truncate from the beginning"). OpenHands has **ten**, organized as a configurable pipeline:

| Condenser | Lines | Strategy |
|-----------|-------|----------|
| `NoOpCondenser` | 22 | Pass-through (no condensation) |
| `RecentEventsCondenser` | 31 | Keep only the N most recent events |
| `ObservationMaskingCondenser` | 39 | Replace observation content with placeholders |
| `BrowserOutputCondenser` | 49 | Specifically condense verbose browser output |
| `AmortizedForgettingCondenser` | 69 | Probabilistically drop older events (exponential decay) |
| `LLMAttentionCondenser` | 140 | Use LLM to score event importance, keep high-scoring ones |
| `LLMSummarizingCondenser` | 182 | LLM generates a summary that replaces the history |
| `ConversationWindowCondenser` | 188 | Sliding window with configurable keep-first/keep-last |
| `StructuredSummaryCondenser` | 329 | LLM generates structured summary with task progress tracking |
| `Pipeline` | 50 | Chain multiple condensers in sequence |

The `Pipeline` condenser is the key: it lets you compose strategies. You could run `BrowserOutputCondenser` → `ObservationMaskingCondenser` → `LLMSummarizingCondenser` to first clean browser noise, then mask verbose observations, then summarize what's left.

The `RollingCondenser` base class introduces a `should_condense` / `get_condensation` split. The condenser doesn't just return events — it can return a `Condensation` object, which is an action that gets added to the event stream. On the next agent step, the condenser uses that condensation event to produce a new `View`. This means condensation is itself an event in the history, creating an auditable trail of when and why context was compressed.

The `AmortizedForgettingCondenser` (69 lines) is clever: instead of hard-truncating, it assigns each event a survival probability that decays with age. Older events are probabilistically dropped. This means the agent gradually "forgets" old context rather than cliff-edging at a window boundary. Simple idea, surprisingly rare in production.

### Three-Layer Security

![Security Architecture](openhands-2.png)

```
SecurityAnalyzer (base)
├── GraySwanAnalyzer     → External API (Cygnal) — ML-based risk scoring
├── InvariantAnalyzer    → Policy engine — rule-based action filtering
└── LLMRiskAnalyzer      → LLM-based — asks the model to evaluate its own actions
```

**GraySwan** (208 lines) calls an external API (Cygnal) with the recent conversation history, gets back a risk score, and maps it to LOW/MEDIUM/HIGH using configurable thresholds. It converts the OpenHands event stream to OpenAI message format before sending. This is the "phone a friend" approach — outsource the security judgment to a specialized model.

**InvariantAnalyzer** (133 lines) uses a policy engine client. You define policies (rules about what the agent can/cannot do), and the analyzer evaluates each action against them. It maintains a trace of all events and checks if the proposed action would violate any policy. There's also an "ask for confirmation" mode where policy violations trigger user approval instead of outright denial.

**LLMRiskAnalyzer** (48 lines) is the lightest: it asks the same LLM that's driving the agent to evaluate the risk of its own action. This is reflexive security — the model checking its own work. It's the weakest of the three (self-evaluation has known limitations) but it's zero-cost in terms of external dependencies.

No other open-source agent project we've analyzed has all three approaches. Goose has pattern matching + LLM review. Claude Code has an allowlist. OpenHands has external ML + policy engine + self-evaluation, and they're composable.

### The Stuck Detector: 487 Lines of Loop Paranoia

`StuckDetector` is a dedicated class (not a utility function, not a flag) that analyzes the event history for repeated patterns:

- Detects repeated identical actions (same command run N times)
- Detects repeated error-action cycles (same error → same fix attempt → same error)
- Detects syntax error loops (specific Python error messages)
- Handles interactive vs headless mode differently (interactive mode only looks at history after the last user message)
- Produces a `StuckAnalysis` dataclass with loop type, repeat count, and start index

When stuck is detected, the controller emits a `LoopDetectionObservation` and triggers `_handle_loop_recovery_action`, which attempts to break the loop by changing the agent's approach. There's also a separate 409-line test class (`TestAgentControllerLoopRecovery`) just for recovery logic.

This is the most thorough stuck-detection system in any open-source agent. Most agents either don't detect loops at all (Cline, Dify) or have a simple "max retries" counter (Claude Code). OpenHands treats it as a first-class problem with its own analysis framework.

---

## How It Actually Works

### The Agent Hub: 6 Agents with Different Strategies

OpenHands ships six agent implementations, but `CodeActAgent` is the primary one. The others exist for specialized tasks or testing:

| Agent | Purpose | Key Trait |
|-------|---------|-----------|
| `CodeActAgent` | Primary coding agent | Function calling with 8 tools (bash, browser, edit, ipython, think, finish, condensation request, task tracker) |
| `BrowsingAgent` | Web browsing only | Dedicated browser interaction |
| `VisualBrowsingAgent` | Screenshot-based browsing | Uses screenshots instead of DOM |
| `LOCAgent` | Localization agent | Finds relevant code locations |
| `ReadOnlyAgent` | Read-only analysis | Cannot modify files |
| `DummyAgent` | Testing | Predictable actions for CI |

`CodeActAgent` (316 lines) is the interesting one. It uses function calling (not free-form text) to invoke tools. Each tool is a class: `create_cmd_run_tool` for bash, `BrowserTool` for web interaction, `LLMBasedFileEditTool` for AI-powered edits, `create_str_replace_editor_tool` for surgical text replacement, `CondensationRequestTool` for explicitly requesting context condensation, `ThinkTool` for scratchpad reasoning, `create_task_tracker_tool` for progress tracking, and `FinishTool` for completion.

The `CondensationRequestTool` deserves attention: it lets the agent **voluntarily trigger condensation**. The agent can say "my context is getting long, please condense" instead of waiting for the system to force it. This is a form of meta-cognition — the agent managing its own memory budget.

### The Event-Driven Core

OpenHands uses an event sourcing architecture. Everything is an `Event` — actions (what the agent wants to do), observations (what happened), messages (user input), and system events (state changes). The `EventStream` is a pub/sub bus where the controller, agents, and runtime are all subscribers.

```
User message → MessageAction → EventStream
                                    ↓
AgentController.on_event() → step() → agent.step(state)
                                    ↓
                              Action (e.g., CmdRunAction)
                                    ↓
                          SecurityAnalyzer.security_risk()
                                    ↓
                          Runtime.execute(action)
                                    ↓
                          Observation (e.g., CmdOutputObservation)
                                    ↓
                              EventStream → AgentController
                                    ↓
                              Next step...
```

The events are typed. `ActionType` has 20+ variants: `RUN` (shell command), `READ` (file read), `WRITE` (file write), `EDIT` (file edit), `BROWSE` (web browsing), `BROWSE_INTERACTIVE` (browser interaction), `RUN_IPYTHON` (Jupyter execution), `DELEGATE` (spawn sub-agent), `FINISH` (task complete), `REJECT` (refuse task), `MCP` (MCP tool call), `THINK` (reasoning). Each maps to a typed dataclass.

### Docker Sandboxing

The runtime layer provisions Docker containers for code execution. The `ActionExecutionServer` runs inside the container and accepts gRPC-style commands from the host. Four runtime implementations:

- **Docker** — Standard container lifecycle
- **Kubernetes** — K8s pod management
- **Local** — Direct host execution (development only)
- **Remote** — Connects to a pre-provisioned runtime

The Docker runtime mounts a workspace directory and runs an `action_execution_server.py` inside the container. This server handles file operations, shell commands, Jupyter cells, and browser automation. Commands flow over HTTP between the host controller and the in-sandbox server.

### Agent Delegation

`AgentController` supports hierarchical delegation. When the primary agent emits an `AgentDelegateAction`, the controller spawns a child `AgentController` with a different agent type. The child has its own state, iteration budget, and can itself delegate further. The parent/child relationship is tracked via `parent` and `delegate` properties.

This enables patterns like: `CodeActAgent` delegates web research to `BrowsingAgent`, which completes and returns results to the parent. Each delegate gets its own iteration count within a global budget.

---

## The V0/V1 Split

This is the elephant in the room. Every core file has this banner:

```python
# IMPORTANT: LEGACY V0 CODE - Deprecated since version 1.0.0, scheduled for removal April 1, 2026
# V1 replacement for this module lives in the Software Agent SDK.
```

The V1 architecture is split between:
1. **Software Agent SDK** (external repo: `github.com/OpenHands/software-agent-sdk`) — The new agent core
2. **`openhands/app_server/`** (15,218 lines in this repo) — The new web application server

The V1 app server already handles conversations, settings, auth, git integrations, and user management. But for the actual agent loop, it still delegates to the V0 `AgentController`. The migration is in-progress: the V0 code is heavily used, the V1 SDK isn't in this repo, and the deprecation date has passed.

This creates a real dilemma for contributors: do you fix bugs in V0 code that's slated for removal, or do you wait for V1 which isn't fully available? The codebase comments explicitly say "please avoid extending this legacy file."

---

## The Verdict

OpenHands has the deepest memory management system in any open-source agent. The 10-condenser pipeline with composable strategies, voluntary condensation requests, and auditable condensation events is the most interesting context management design in any open-source agent we've analyzed. If you're building an agent and need inspiration for context management, start here.

The security architecture is more structured than any other open-source agent we analyzed: three complementary approaches (external ML, policy engine, self-evaluation) that can be used individually or together. Compare this to Claude Code's static allowlist or Cline's "do nothing and hope for the best."

The stuck detector is a standout feature that other projects should steal. A 487-line class dedicated to detecting and recovering from agent loops, with pattern analysis, configurable thresholds, and a separate test suite — this treats stuck detection as the engineering problem it actually is.

But the V0/V1 transition is worth watching — 287K lines of Python with deprecation banners and a deferred migration means contributors should check which code path is canonical. The `AgentController` (1,391 lines) would benefit from splitting into focused modules, and the V1 SDK architecture promises exactly that.

The `critic` module is surprisingly thin — just 57 lines total. `AgentFinishedCritic` checks if the agent called `AgentFinishAction` and if the git patch is non-empty. The base class is clean — adding richer evaluators would be a high-impact contribution.

Would I use it? For automated issue resolution and PR workflows, yes — the resolver module (7,039 lines) with 7 git platform integrations is production-tested. For interactive coding, the CodeActAgent with Docker sandboxing is safer than most alternatives. But I'd watch the V0/V1 migration closely before building anything long-term on the internal APIs.

---

## Cross-Project Comparison

| Feature | OpenHands | Claude Code | Goose | Cline |
|---------|-----------|-------------|-------|-------|
| Language | Python + TS | TypeScript | Rust | TypeScript |
| Sandboxing | Docker containers | OS seatbelt/landlock | MCP process isolation | None |
| Context Mgmt | 10 condenser strategies | 4-layer compaction | Auto-compact + pair summarization | Sliding window |
| Security | GraySwan + Invariant + LLM | Permission allowlist | 5-inspector pipeline | User-managed |
| Stuck Detection | Dedicated 487-line detector | Basic retry | RepetitionInspector | None |
| Agent Types | 6 (specialized) | 1 (general) | 1 (general) | 1 (general) |
| Self-Criticism | AgentFinishedCritic (minimal) | None | None | None |
| Git Integrations | 7 platforms | GitHub only | None | None |
| Delegation | Hierarchical sub-agents | Multi-agent | Sub-agent handler | None |
| LOC | ~400K | ~510K | ~200K | ~560K |

OpenHands wins on breadth: more agent types, more condensation strategies, more security layers, more git integrations. But breadth comes at the cost of the V0/V1 transition debt and a 400K-line codebase that's actively being rewritten. Claude Code and Goose are more cohesive — they do fewer things but the code is unified. Cline is the Wild West: no sandboxing, no security, no stuck detection, but the simplest codebase to understand.

---

## Stuff Worth Stealing

### 1. The Condenser Pipeline Pattern

The idea of composable, registerable condensation strategies with a pipeline combinator:

```python
class Condenser(ABC):
    @abstractmethod
    def condense(self, view: View) -> View | Condensation:
        pass

CONDENSER_REGISTRY: dict[type[CondenserConfig], type[Condenser]] = {}
```

Any agent framework could adopt this pattern. Define your condensation strategies as plugins, register them with configs, and chain them in a pipeline. The `Condensation` return type (an action that goes into the event stream) makes condensation auditable.

### 2. Voluntary Condensation Requests

Giving the agent a `CondensationRequestTool` so it can say "condense my history now" instead of waiting for the system to force it. This is meta-cognitive memory management — the agent participates in its own context budget decisions.

### 3. The Environment Variable Blocklist Pattern (from Goose, but applicable here)

OpenHands doesn't do this yet, but should. The Docker sandbox helps, but extensions and plugins that set environment variables inside the container could still exploit `LD_PRELOAD`-style attacks.

---

## Hooks & Easter Eggs

**The Resolver is a standalone product.** `openhands/resolver/` (7,039 lines) is essentially an automated PR review and issue resolution system. It integrates with 7 git platforms, analyzes issues, generates fixes, and creates PRs. This could be extracted as its own project.

**LiteLLM is everywhere.** OpenHands uses LiteLLM for all LLM interactions, including error handling. The import block at the top of `agent_controller.py` imports 12 specific LiteLLM exception types. This tight coupling means switching away from LiteLLM would be a major refactor.

**The `microagent` system.** A separate module (416 lines) for lightweight, task-specific agents that don't need the full AgentController machinery. These are closer to "skills" in OpenClaw terminology — small, focused capabilities that can be invoked without spinning up a full agent session.

**Enterprise layer exists.** The `enterprise/` directory contains organization management, solvability prediction (ML model that predicts if an issue is solvable by the agent), Jira/Linear/Slack integrations, and usage billing. This is the commercial moat around the open-source core.

**Memory monitor VSCode extension.** Inside `openhands/runtime/utils/vscode-extensions/memory-monitor/` there's a tiny VSCode extension that monitors memory usage inside the Docker sandbox. Practical, paranoid, and the kind of thing you add after an OOM kills your agent mid-task.

---

## Verification Log

<details>
<summary>Fact-check log (click to expand)</summary>

| Claim | Verification Method | Result |
|-------|-------------------|--------|
| 70,860 stars | GitHub API | Verified |
| 8,886 forks | GitHub API | Verified |
| ~287K Python LOC | Line count on *.py files | Verified (287,036 lines) |
| ~114K TypeScript LOC | Line count on *.ts + *.tsx files | Verified (113,613 lines) |
| ~400K total LOC | Sum of Python + TypeScript | Verified (400,649 lines) |
| License NOASSERTION | GitHub API `license.spdx_id` | Verified |
| First commit 2024-03-13 | GitHub API `created_at` | Verified |
| GitNexus: 21,157 nodes | `gitnexus analyze` output | Verified |
| GitNexus: 66,716 edges | `gitnexus analyze` output | Verified |
| GitNexus: 1,102 clusters | `gitnexus analyze` output | Verified |
| AgentController 1,391 lines | `agent_controller.py` line range (111-1391) | Verified |
| StuckDetector 487 lines | `stuck.py` line range (27-487) | Verified |
| 10 condenser implementations | Directory listing of `memory/condenser/impl/` | Verified |
| 3 security analyzers | `security/grayswan/`, `security/invariant/`, `security/llm/` | Verified |
| 6 agent types | `agenthub/` directory listing | Verified |
| 7 git integrations | `integrations/` directory listing (GitHub, GitLab, Bitbucket, Bitbucket DC, Azure DevOps, Forgejo + protocols) | Verified |
| V0 deprecation banner present | File headers in controller, agenthub, security | Verified |
| `critic` module 57 lines total | Line count of `critic/base.py` + `critic/finish_critic.py` | Verified |
| Resolver 7,039 lines | Line count of `resolver/` directory | Verified |
| App server 15,218 lines | Line count of `app_server/` directory | Verified |
| CodeActAgent 316 lines | `codeact_agent.py` line range (56-316+) | Verified |
| GraySwanAnalyzer 208 lines | `grayswan/analyzer.py` line range (24-208) | Verified |
| InvariantAnalyzer 133 lines | `invariant/analyzer.py` line range (22-133) | Verified |
| Community clusters from GitNexus | Cypher query on Community nodes | Verified (1,102 total; top: Unit 103, App_server 89, Storage 89, Routes 82) |

</details>

---

*Part of [awesome-ai-anatomy](https://github.com/NeuZhou/awesome-ai-anatomy) — source-level teardowns of how production AI systems actually work. This teardown was produced using GitNexus for structural analysis combined with manual source code review for architectural judgment.*
t.*
ment.*
