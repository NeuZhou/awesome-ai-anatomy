# oh-my-claudecode: 19 Agents Coordinated via mkdir-Based Locks, 194K Lines of TypeScript

> I didn't expect `mkdir` to be a legitimate IPC mechanism, but here we are. A Claude Code plugin spawns 19 agents across 3 different AI models, and they talk to each other through the filesystem. I read 194K lines to find out how.

> **TL;DR:**
> - **What:** A Claude Code plugin that bolts on 19-agent team orchestration — Claude, Codex, and Gemini workers coordinated through file-based IPC with mkdir-based locking
> - **Why it matters:** The only multi-model agent framework I've seen in production — routes Haiku for cheap tasks, Opus for reasoning, runs a plan→exec→verify→fix pipeline
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

## File-Based IPC: mkdir as a Distributed Lock

This is where it gets interesting. And honestly, a little weird.

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

If this pattern looks familiar, you might have seen it in distributed systems. Lamport's work on mutual exclusion ([Lamport 1978](https://lamport.azurewebsites.net/pubs/time-clocks.pdf)) established the theory, but the *practical* trick of using filesystem atomicity as a lock primitive has been a folk technique in Unix sysadmin for decades — lock directories for cron jobs, PID files, NFS-safe coordination. The [Open Group's specification](https://pubs.opengroup.org/onlinepubs/9699919799/functions/mkdir.html) guarantees `mkdir` atomicity, which is why it shows up in everything from Maildir to Git's own ref locking.

OMC essentially reinvents this for agent coordination. And I think it's the right call? The workers are **separate processes** — real Claude, Codex, and Gemini CLI instances running in tmux panes. They can't share memory. Sockets would work but add complexity. File-based IPC is the lowest-common-denominator thing that just... works.

I've used this pattern before (job queues with NFS-mounted directories, back when that was a thing people did). The failure mode is slow (polling + file I/O), not wrong. That's a good tradeoff for a system that's coordinating LLM calls that take seconds each.

(The exponential backoff polling from 25ms to 500ms is a nice touch — shows someone actually thought about thundering herd problems.)

---

## 19 Specialized Agents, Three Models

![19 Specialized Agents](oh-my-claudecode-2.png)

OMC defines 19 agent roles with model tier assignments.

The interesting bit isn't the number of agents — it's the model routing. Simple tasks get Haiku (cheap), complex reasoning gets Opus (expensive), everything else gets Sonnet. The `critic` agent specifically uses Haiku because criticism doesn't need deep reasoning — it just needs to point out problems.

This maps directly to what the research community calls **model routing** or **LLM cascading**. FrugalGPT ([Chen et al., 2023](https://arxiv.org/abs/2305.05176)) showed you can cut costs up to 98% by routing queries to the cheapest model that can handle them. RouteLLM ([Ong et al., 2024](https://arxiv.org/abs/2406.18665)) formalized this further with trained routers that predict query difficulty. OMC's approach is simpler — static role-to-tier mapping rather than dynamic routing — but it captures the core insight: not every token needs your most expensive model.

Each agent's prompt is loaded from a Markdown file in `/agents/*.md`, which means you can customize agent behavior without touching code. Prompt-as-config, basically.

I'm not sure how well the static mapping holds up under varied workloads (what if a "simple" task turns out to need deep reasoning?), but for a plugin that's managing costs, it's a pragmatic starting point.

---

## Team Pipeline: plan → exec → verify → fix

![Team Pipeline](oh-my-claudecode-3.png)

Team mode runs as a staged pipeline with retry loops.

The phase controller infers the current phase from task status distribution — no explicit state machine transitions. It looks at how many tasks are pending/in_progress/completed/failed and figures out what phase the team is in.

A subtle but important detail: tasks with `metadata.permanentlyFailed === true` have status `completed` but are counted as failed. This prevents the pipeline from reporting success when some tasks actually failed. (I almost missed this. It's the kind of silent correctness bug that would haunt you in production.)

---

## The Multi-Agent Angle (and what the papers say)

So here's the thing — OMC is implementing multi-agent coordination in production, and there's a whole body of academic work on exactly this problem.

CAMEL ([Li et al., NeurIPS 2023](https://arxiv.org/abs/2303.17760)) established the role-playing paradigm: assign agents distinct roles, let them talk. OMC has 19 roles. MetaGPT ([Hong et al., 2023](https://arxiv.org/abs/2308.00352)) argued that free-form dialogue between agents leads to "hallucination contagion" — one agent hallucinates, the next one builds on it — and proposed structured SOP-based communication instead (agents pass PRDs and design docs, not chat messages). ChatDev ([Qian et al., ACL 2024](https://arxiv.org/abs/2307.07924)) took a middle ground with their Chat Chain approach.

OMC lands somewhere between these. The agents communicate through structured JSONL files (closer to MetaGPT's structured approach), but the coordination is looser than MetaGPT's rigid pipeline.  The survey by [Guo et al. (2024)](https://arxiv.org/abs/2402.01680) categorizes multi-agent communication structures as layered, centralized, decentralized, or shared-message-pool — OMC's file-based inbox/outbox is basically a shared message pool with directory-level partitioning.

What I find interesting: MetaGPT's structured output approach (pass documents, not chat) directly addresses the hallucination contagion problem. OMC's JSONL messages are structured, but the _content_ is still free text. I don't know if hallucination contagion is a real problem at this scale (19 agents is a lot of telephone-game hops), but it's something worth watching.

---

## The Verdict

OMC is the most ambitious of the four projects I've torn down, and also the most sprawling. 194K lines of TypeScript for a Claude Code plugin is... a lot. The 19-agent definitions are mostly thin wrappers around different system prompts — the real engineering is in the team coordination layer (125 TypeScript files in the `team/` directory).

The file-based IPC is the right call for cross-process coordination, and the mkdir-based locking is solid. It's an old pattern, well-applied.

The multi-model angle (Claude + Codex + Gemini) is the actual differentiator. None of the other frameworks I've looked at coordinate across model providers. Whether you *need* tri-model coordination is a different question — but it's cool that someone built it.

One thing to keep in mind: as a plugin that depends on Claude Code's internals, any upstream API change can break things. An abstraction layer would help, but that's easy advice to give and hard to implement when you're moving fast.

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

## Paper References

| Topic | Paper | Relevance to OMC |
|-------|-------|-------------------|
| Multi-agent role-playing | [CAMEL (Li et al., NeurIPS 2023)](https://arxiv.org/abs/2303.17760) | OMC's 19-role system is CAMEL's role-playing at scale |
| Structured multi-agent SOP | [MetaGPT (Hong et al., 2023)](https://arxiv.org/abs/2308.00352) | OMC uses structured JSONL, not free chat — similar intuition |
| Chat-chain coordination | [ChatDev (Qian et al., ACL 2024)](https://arxiv.org/abs/2307.07924) | OMC's pipeline phases echo ChatDev's Chat Chain |
| Multi-agent survey | [Guo et al., 2024](https://arxiv.org/abs/2402.01680) | Taxonomy of agent communication patterns |
| LLM cost routing | [FrugalGPT (Chen et al., 2023)](https://arxiv.org/abs/2305.05176) | Theoretical basis for OMC's model tier routing |
| Router training | [RouteLLM (Ong et al., 2024)](https://arxiv.org/abs/2406.18665) | Dynamic routing (OMC uses static mapping instead) |
| Distributed mutex theory | [Lamport, 1978](https://lamport.azurewebsites.net/pubs/time-clocks.pdf) | Foundation for OMC's mkdir-based locking approach |

---

## Verification Log

<details>
<summary>Details</summary>

| Claim | Method | Result |
|-------|--------|--------|
| 24,423 stars | GitHub API | Confirmed |
| 194K LOC | wc -l on src/**/*.ts | Confirmed |
| 19 agents | Counted in definitions.ts | Confirmed |
| 125 files in team/ | ls count | Confirmed |
| mkdir-based locking | dispatch-queue.ts source | Confirmed |
| File paths referenced | Verified exist in clone | Confirmed |

</details>

---

*Part of [awesome-ai-anatomy](https://github.com/NeuZhou/awesome-ai-anatomy) — source-level teardowns of how production AI systems actually work.*
