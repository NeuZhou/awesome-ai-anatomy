<p align="center">
  <img src="assets/hero-banner.png" alt="Awesome AI Anatomy" width="100%">
</p>

<p align="center">
  <b>English</b> | <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="https://github.com/NeuZhou/awesome-ai-anatomy/stargazers"><img src="https://img.shields.io/github/stars/NeuZhou/awesome-ai-anatomy?style=social" alt="Stars"></a>
  <a href="https://github.com/NeuZhou/awesome-ai-anatomy/network/members"><img src="https://img.shields.io/github/forks/NeuZhou/awesome-ai-anatomy?style=social" alt="Forks"></a>
  <a href="https://twitter.com/Neuzhou_"><img src="https://img.shields.io/twitter/follow/Neuzhou_?style=social" alt="Twitter"></a>
  <img src="https://img.shields.io/badge/teardowns-14-blue" alt="Teardowns">
  <img src="https://img.shields.io/badge/updated-weekly-brightgreen" alt="Updated Weekly">
  <img src="https://img.shields.io/github/last-commit/NeuZhou/awesome-ai-anatomy?label=Last%20Updated" alt="Last Updated">
  <img src="https://img.shields.io/badge/license-MIT-orange" alt="License">
</p>

<h3 align="center">We read the source code. All of it. Here's what we found.</h3>

> **Claude Code** hides 18 virtual pet species inside production code that runs on your machine.
> **MemPalace** got 30K stars in 4 days — with 7,600 lines of Python.
> **oh-my-codex** runs 30 AI agents in parallel using git worktrees for isolation.
> None of this is in the docs. We found it by reading every file.

<p align="center"><i>⭐ Star = subscribe to weekly teardowns. GitHub notifies you when we publish.</i></p>

# Awesome AI Anatomy

14 AI agent projects dissected — architecture diagrams, design patterns, and the engineering decisions nobody documents.

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
| 3 | **MiroFish's "collective intelligence" = LLM social simulation** — agents role-playing humans on a simulated social network | [MiroFish](mirofish/) | 50K stars driven by a compelling vision of agent-based prediction |
| 4 | **Lightpanda's bitcast dispatch** makes Zig act like a language with vtables — a systems trick we'd never seen before | [Lightpanda](lightpanda-browser/) | Zig comptime metaprogramming pushed to its limits |
| 5 | **DeerFlow's orphan tool call bug** — 93 lines of code fix a crash that affects every LangGraph-based agent | [DeerFlow](deer-flow/) | If you use LangGraph, you probably have this bug too |

> These are real findings from reading source code, not vibes from README files.

---

## Project Index

14 AI agent source code analyses — from orchestration frameworks to coding assistants.

> 📱 On mobile? Scroll right to see all columns, or tap a project name to read the full teardown.

| # | Project | Stars | Language | Lines | Key Findings | Status |
|---|---------|-------|----------|-------|-------------|--------|
| 001 | [**Dify**](dify/) | 136K | Python + TS | 1.24M | `graphon` engine, 7+ containers, 30+ vector DBs | Published |
| 002 | [**Claude Code**](claude-code/) | 109K | TypeScript | 510K | 4-layer context, hidden pet system (18 species) | Published |
| 003 | [**OpenHands**](openhands/) | 71K | Python + TS | 400K | 10 condensers, 3-layer security, 487-line stuck detector, V0/V1 mid-migration | **NEW** |
| 004 | [**DeerFlow**](deer-flow/) | 58K | Python + TS | — | 14-layer middleware, hash loop kill@5, no RBAC | Published |
| 005 | [**MiroFish**](mirofish/) | 50K | Python + Vue | 39K | LLM social simulation engine for collective intelligence | Published |
| 006 | [**Goose**](goose/) | 37K | Rust + TS | 198K | MCP-first bus, 5-inspector pipeline, 30+ LLMs | Published |
| 007 | [**Pi Mono**](pi-mono/) | 32K | TypeScript | 147K | Game-engine arch, stealth mode as Claude Code | Published |
| 008 | [**MemPalace**](mempalace/) | 30K | Python | 9K | Milla Jovovich's memory palace, 4-layer stack, AAAK dialect debunked, shell injection | **NEW** |
| 009 | [**Lightpanda**](lightpanda-browser/) | 27K | Zig + Rust | 91K | From-scratch browser for AI agents, 9x Chrome | Published |
| 010 | [**Hermes Agent**](hermes-agent/) | 26K | Python | 260K | Self-improving skills, FTS5 search, frozen mem | Published |
| 011 | [**oh-my-claudecode**](oh-my-claudecode/) | 24K | TypeScript | 194K | 19-agent team via file IPC, Haiku→Opus routing | Published |
| 012 | [**Guardrails AI**](guardrails-ai/) | 6.6K | Python | 18K | Validator Hub, reask self-correction loop | Published |
| 013 | [**OpenAI Codex CLI**](codex-cli/) | 27K+ | Rust | 549K | Queue-pair arch, Guardian AI approval, 3-OS sandbox | Published |
| 014 | [**Cline**](cline/) | 60K | TypeScript | 560K | 3,756-line God Object, 40+ providers, YOLO mode, hooks system | Published |

Projects sorted by GitHub stars (descending).

---

## Cross-Project Comparison

We maintain a detailed **[COMPARISON.md](COMPARISON.md)** with side-by-side analysis across all 14 projects:

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

- **[COMPARISON.md](COMPARISON.md)** — Side-by-side comparison across all 14 projects
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

14 deep-dives published so far. The next batch is already in progress.

- [Changelog](CHANGELOG.md) — track every update
- Substack: [AI Anatomy Newsletter](https://neuzhou.substack.com) — condensed teardowns in your inbox
- Discord: [Join the community](https://discord.gg/kAQD7Cj8) — discuss architecture decisions

---

## ⭐ Still reading? This list is worth a star.

<p align="center">
  <a href="https://github.com/NeuZhou/awesome-ai-anatomy">
    <img src="https://img.shields.io/github/stars/NeuZhou/awesome-ai-anatomy?style=for-the-badge&logo=github&label=Star%20This%20Repo&color=yellow" alt="Star This Repo">
  </a>
</p>

<p align="center">
  <b>One star = weekly AI architecture teardowns delivered to your GitHub notifications.</b><br>
  We publish new teardowns every week. Star to stay in the loop.
</p>

<p align="center">
  <a href="https://star-history.com/#NeuZhou/awesome-ai-anatomy&Date">
    <img src="https://api.star-history.com/svg?repos=NeuZhou/awesome-ai-anatomy&type=Date" width="600" alt="Star History Chart">
  </a>
</p>

---

## Legal Notice

These teardowns are independent technical commentary for educational purposes under fair use (criticism, commentary, and education). Analysis of proprietary products is based on publicly available information including published npm packages, source maps, and documentation. No source code from analyzed projects is hosted in this repository — only short citations for commentary.

Project names and trademarks belong to their respective owners. Star counts and metrics are snapshots at time of writing. Analysis may contain errors — please verify claims against current source code.

For takedown requests, please [open an issue](https://github.com/NeuZhou/awesome-ai-anatomy/issues/new) with specific concerns.

---

<p align="center">
  <i>14 projects dissected. Updated weekly.<br>If you build AI agents, you should know how the best ones actually work.</i>
</p>
