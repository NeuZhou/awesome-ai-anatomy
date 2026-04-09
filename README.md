<p align="center">
  <img src="assets/hero-banner.png" alt="Awesome AI Anatomy" width="100%">
</p>

<p align="center">
  <b>English</b> | <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/NeuZhou/awesome-ai-anatomy?style=social" alt="Stars">
  <img src="https://img.shields.io/github/forks/NeuZhou/awesome-ai-anatomy?style=social" alt="Forks">
  <img src="https://img.shields.io/badge/teardowns-13-blue" alt="Teardowns">
  <img src="https://img.shields.io/badge/updated-weekly-brightgreen" alt="Updated Weekly">
  <img src="https://img.shields.io/badge/license-MIT-orange" alt="License">
</p>

# Awesome AI Anatomy

**13 AI agent projects dissected. Some had hidden pet systems. Some had zero security. All had God Objects.**

Claude Code ships 18 virtual pet species in production. Pi Mono can impersonate Claude Code to dodge rate limits. MiroFish's "collective intelligence" is just LLMs role-playing on a fake social network. These aren't hot takes — they're findings from reading every line of code.

Most "awesome" lists link to repos. We crack them open — architecture diagrams, design trade-offs, code smells, security gaps, and the engineering decisions nobody talks about in the docs.

---

## Table of Contents

- [Greatest Hits](#greatest-hits)
- [Project Index](#project-index)
- [Cross-Project Comparison](#cross-project-comparison)
- [What Makes This Different](#what-makes-this-different)
- [Each Teardown Includes](#each-teardown-includes)
- [Coming Next](#coming-next)
- [Contributing](#contributing)
- [Stay Updated](#stay-updated)

---

## Greatest Hits

The 5 findings people can't stop sharing:

| # | Finding | Project | Why It Matters |
|---|---------|---------|---------------|
| 1 | **Claude Code ships 18 virtual pet species** — a full tamagotchi system hidden in a coding agent | [Claude Code](claude-code/) | What else is hiding in tools you run with `sudo`? |
| 2 | **Pi Mono's "stealth mode" impersonates Claude Code** — fakes tool names to dodge rate limits | [Pi Mono](pi-mono/) | Open-source projects gaming API providers is a trend |
| 3 | **MiroFish's "collective intelligence" = zero collective intelligence** — it's LLMs role-playing humans on a simulated social network | [MiroFish](mirofish/) | 50K stars built on marketing, not on the tech the name promises |
| 4 | **Lightpanda's bitcast dispatch** makes Zig act like a language with vtables — a systems trick we'd never seen before | [Lightpanda](lightpanda-browser/) | Zig comptime metaprogramming pushed to its limits |
| 5 | **DeerFlow's orphan tool call bug** — 93 lines of code fix a crash that affects every LangGraph-based agent | [DeerFlow](deer-flow/) | If you use LangGraph, you probably have this bug too |

> These are real findings from reading source code, not vibes from README files.

---

## Project Index

13 AI agent source code analyses — from orchestration frameworks to coding assistants.

> 📱 On mobile? Scroll right to see all columns, or tap a project name to read the full teardown.

| # | Project | Stars | Language | Lines | Key Findings | Status |
|---|---------|-------|----------|-------|-------------|--------|
| 001 | [**Dify**](dify/) | 136K | Python + TS | 1.24M | `graphon` engine, 7+ containers, 30+ vector DBs | Published |
| 002 | [**Claude Code**](claude-code/) | 109K | TypeScript | 510K | 4-layer context, hidden pet system (18 species) | Published |
| 003 | [**OpenHands**](openhands/) | 71K | Python + TS | 400K | 10 condensers, 3-layer security, 487-line stuck detector, V0/V1 mid-migration | **NEW** |
| 004 | [**DeerFlow**](deer-flow/) | 58K | Python + TS | — | 14-layer middleware, hash loop kill@5, no RBAC | Published |
| 005 | [**MiroFish**](mirofish/) | 50K | Python + Vue | 39K | LLM social sim as "collective intelligence" | Published |
| 006 | [**Goose**](goose/) | 37K | Rust + TS | 198K | MCP-first bus, 5-inspector pipeline, 30+ LLMs | Published |
| 007 | [**Pi Mono**](pi-mono/) | 32K | TypeScript | 147K | Game-engine arch, stealth mode as Claude Code | Published |
| 008 | [**Lightpanda**](lightpanda-browser/) | 27K | Zig + Rust | 91K | From-scratch browser for AI agents, 9x Chrome | Published |
| 009 | [**Hermes Agent**](hermes-agent/) | 26K | Python | 260K | Self-improving skills, FTS5 search, frozen mem | Published |
| 010 | [**oh-my-claudecode**](oh-my-claudecode/) | 24K | TypeScript | 194K | 19-agent team via file IPC, Haiku→Opus routing | Published |
| 011 | [**Guardrails AI**](guardrails-ai/) | 6.6K | Python | 18K | Validator Hub, reask self-correction loop | Published |
| 012 | [**OpenAI Codex CLI**](codex-cli/) | 27K+ | Rust | 549K | Queue-pair arch, Guardian AI approval, 3-OS sandbox | Published |
| 013 | [**Cline**](cline/) | 60K | TypeScript | 560K | 3,756-line God Object, 40+ providers, YOLO mode, hooks system | Published |

Projects sorted by GitHub stars (descending).

---

## Cross-Project Comparison

We maintain a detailed **[COMPARISON.md](COMPARISON.md)** with side-by-side analysis across all 13 projects:

- Quick Reference (creator, stars, language, type, license)
- Architecture patterns (agent loop, extensibility, deployment)
- Multi-agent & orchestration approaches
- Memory & persistence strategies

We also have a **[CROSS-CUTTING.md](CROSS-CUTTING.md)** — a deep horizontal analysis covering:

- Architecture pattern taxonomy across all projects
- Context management strategies compared
- Tool system design patterns
- Security ratings (A-F grading)
- Anti-pattern catalog with evidence
- "Build from scratch" recommendations
- Safety & security postures
- "If I Were Building an Agent Today" synthesis

**[Read the full comparison →](COMPARISON.md)**

---

## What Makes This Different

| Other "awesome" lists | This repo |
|----------------------|-----------|
| Link to repos | **Dissect** repos |
| "What they use" | **Why they chose it** |
| Stars and badges | **Architecture diagrams + trade-off analysis** |
| Surface-level | **Staff-engineer-level depth** |
| Praise everything | **Find real problems** |

---

## Each Teardown Includes

- 📐 **Architecture diagrams** — d2-rendered PNG with component relationships
- 🏆 **Overall rating** — A-F scale across security, architecture, code quality, and more
- 🔬 **Core innovation analysis** — what the project does that nobody else does
- 📍 **Code-level references** — file paths + line numbers for every claim
- 📊 **Cross-project comparison table** — how it stacks up against alternatives
- 💡 **"Stuff Worth Stealing"** — patterns other projects should adopt
- ✅ **Verification log** — every factual claim fact-checked against source code
- 🥚 **Easter eggs and hidden details** — the stuff you'd only find reading every file

---

## Knowledge Base

Beyond individual teardowns, we maintain cross-cutting analysis:

- **[COMPARISON.md](COMPARISON.md)** — Side-by-side comparison across all 13 projects
- **[CROSS-CUTTING.md](CROSS-CUTTING.md)** — Patterns, anti-patterns, and architectural trends
- **[knowledge/](knowledge/)** — Structured knowledge base: design patterns, anti-patterns, and project metadata

---

## Coming Next

- [ ] browser-use (86K stars) — AI browser automation, Python
- [ ] Crush (22K stars) — OpenCode's successor, built by the Charm team (Bubble Tea)
- [ ] Cursor — the most controversial AI IDE (closed source, partial analysis)

---

## Contributing

Found an error? Have a better analysis? PRs welcome.

- Fix factual errors
- Add missing architecture details
- Suggest projects to teardown → [Open an Issue](https://github.com/NeuZhou/awesome-ai-anatomy/issues)
- Help translate teardowns

---

## Stay Updated

New teardown every week. Cursor, Windsurf, and others are on the list.

**Star this repo** — GitHub will notify you when new teardowns drop.

**Watch** — Get notified for every new teardown, not just the ones that trend.

13 deep-dives published so far. The next batch is already in progress.

- [Changelog](CHANGELOG.md) — track every update
- Substack: [AI Anatomy Newsletter](https://neuzhou.substack.com) — condensed teardowns in your inbox
- Discord: [Join the community](https://discord.gg/kAQD7Cj8) — discuss architecture decisions

---

<details>
<summary>Disclaimer</summary>

These teardowns are independent technical commentary for educational purposes. All code snippets are cited under fair use for criticism, commentary, and education. Project names and trademarks belong to their respective owners. Star counts and LOC figures are snapshots at time of writing and may have changed.

If you're a project maintainer and have concerns about any content, please [open an issue](https://github.com/NeuZhou/awesome-ai-anatomy/issues/new).

</details>

---

<p align="center">
  <i>13 projects dissected. Updated weekly.<br>If you build AI agents, you should know how the best ones actually work.</i>
</p>
