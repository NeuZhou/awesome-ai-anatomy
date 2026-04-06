# Knowledge Base Schema

## Pattern Format (patterns/*.yaml)

```yaml
name: middleware-chain
category: architecture  # architecture | memory | security | execution | communication
description: "Chain of middleware functions that process each request sequentially"
tags: [middleware, pipeline, chain-of-responsibility]

first_seen:
  project: deer-flow
  file: backend/packages/harness/deerflow/agents/lead_agent/agent.py
  lines: 210-260
  date: 2026-04-05

also_seen:
  - project: hermes-agent
    notes: "Not explicit middleware — monolithic 9K-line agent loop"
  - project: openclaw
    notes: "Event-driven equivalent"

pros:
  - "Clean separation of concerns — each middleware is testable in isolation"
  - "Easy to add/remove features without touching core logic"

cons:
  - "Ordering constraints become complex beyond ~15 middlewares"
  - "Hard to debug across middleware boundaries"

verdict: "Best pattern for agent frameworks that need extensibility. Use a topological sort for ordering if you have >10 middlewares."

related_patterns:
  - event-bus
  - plugin-system
```

## Project Metadata Format (projects/*.yaml)

```yaml
name: deer-flow
full_name: bytedance/deer-flow
url: https://github.com/bytedance/deer-flow
stars: 58080  # verified via API
forks: 7241
language: Python
framework: LangGraph + FastAPI + Next.js
loc: 0  # TODO: verify with cloc
license: MIT
first_commit: 2025-05-07
teardown_date: 2026-04-05
teardown_path: deer-flow/README.md

patterns_used:
  - middleware-chain
  - subagent-pool
  - loop-detection
  - memory-hierarchy
  - virtual-path-sandbox
  - clarification-interrupt

anti_patterns_found:
  - no-cost-budget
  - advisory-security

key_metrics:
  middleware_count: 14
  subagent_max_concurrent: 3
  subagent_max_depth: 1
  memory_storage: json-file
  im_channels: [feishu, slack, telegram]

comparison_notes:
  vs_hermes: "More architecturally clean (middleware chain vs monolith), but fewer features (no learning loop, no session search)"
  vs_openclaw: "Python rewrite feel. Both use LangGraph but different execution models"
```

## Anti-Pattern Format (anti-patterns/*.yaml)

```yaml
name: god-file
category: maintainability
description: "Single file containing thousands of lines with the entire agent loop"
severity: high  # low | medium | high | critical

seen_in:
  - project: hermes-agent
    file: run_agent.py
    lines: 9000+
    notes: "Every PR touches this file. No separation of concerns."

impact:
  - "Every merge conflict happens in one file"
  - "New contributors can't understand the codebase"
  - "Impossible to test individual components"

better_alternative: "Middleware chain pattern (see: deer-flow)"
```

## Comparison Format (comparisons/*.yaml)

```yaml
name: memory-systems
category: memory
description: "How different agent frameworks handle persistent memory"
last_updated: 2026-04-05

dimensions:
  - name: storage_format
    deer-flow: "JSON file (hierarchical)"
    hermes-agent: "Markdown files (MEMORY.md + USER.md)"
    openclaw: "Markdown files (MEMORY.md)"
    claude-code: "CLAUDE.md (rules only)"
    
  - name: structure
    deer-flow: "user/history/facts with confidence scores"
    hermes-agent: "flat entries with § delimiter"
    openclaw: "free-form markdown sections"
    claude-code: "flat rules"

  - name: update_mechanism
    deer-flow: "LLM-extracted, debounced, async"
    hermes-agent: "Agent tool calls (add/replace/remove)"
    openclaw: "Manual + agent-written"
    claude-code: "Manual only"

  - name: cross_session
    deer-flow: "No"
    hermes-agent: "FTS5 session search + LLM summarization"
    openclaw: "Session transcripts in memory/"
    claude-code: "No"

  - name: security
    deer-flow: "No scanning"
    hermes-agent: "Threat pattern scanning on memory writes"
    openclaw: "No scanning"
    claude-code: "No scanning"

analysis: |
  Hermes has the most complete memory system (structured + searchable + scanned).
  DeerFlow has the best schema design (hierarchical + confidence scores).
  Both OpenClaw and Claude Code are primitive by comparison.
  None of them handle concurrent writes safely.
```
