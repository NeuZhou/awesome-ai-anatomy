<p align="center">
  <img src="assets/hero-banner.png" alt="Awesome AI Anatomy" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/NeuZhou/awesome-ai-anatomy?style=social" alt="Stars">
  <img src="https://img.shields.io/github/forks/NeuZhou/awesome-ai-anatomy?style=social" alt="Forks">
  <img src="https://img.shields.io/badge/teardowns-10-blue" alt="Teardowns">
  <img src="https://img.shields.io/badge/updated-weekly-brightgreen" alt="Updated Weekly">
  <img src="https://img.shields.io/badge/license-MIT-orange" alt="License">
</p>

# 🔬 Awesome AI Anatomy

**We read 2.5M lines of AI agent source code so you don't have to. 10 projects dissected. Some had hidden pet systems. Some had zero security. All had God Objects.**

Claude Code ships 18 virtual pet species in production. Pi Mono can impersonate Claude Code to dodge rate limits. MiroFish's "collective intelligence" is just LLMs role-playing on a fake social network. These aren't hot takes — they're findings from reading every line of code.

Most "awesome" lists link to repos. We crack them open — architecture diagrams, design trade-offs, code smells, security gaps, and the engineering decisions nobody talks about in the docs.

---

## 📋 Table of Contents

- [Greatest Hits](#-greatest-hits)
- [Project Index](#-project-index)
- [Cross-Project Comparison](#-cross-project-comparison)
- [What Makes This Different](#-what-makes-this-different)
- [Each Teardown Includes](#-each-teardown-includes)
- [Coming Next](#️-coming-next)
- [Contributing](#-contributing)
- [Stay Updated](#-stay-updated)

---

## 🔥 Greatest Hits

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

## 📊 Project Index

> 10 AI agent source code analyses — from orchestration frameworks to coding assistants.

| # | Project | Stars | Language | Lines | Key Findings | Status |
|---|---------|-------|----------|-------|-------------|--------|
| 001 | [**Dify**](dify/) | 136K ⭐ | Python + TS | 1.24M | `graphon` engine, 7+ containers, 30+ vector DBs | ✅ Published |
| 002 | [**DeerFlow**](deer-flow/) | 58K ⭐ | Python + TS | — | 14-layer middleware, hash loop kill@5, no RBAC | ✅ Published |
| 003 | [**MiroFish**](mirofish/) | 50K ⭐ | Python + Vue | 39K | LLM social sim as "collective intelligence" | ✅ Published |
| 004 | [**Goose**](goose/) | 37K ⭐ | Rust + TS | 198K | MCP-first bus, 5-inspector pipeline, 30+ LLMs | ✅ Published |
| 005 | [**Pi Mono**](pi-mono/) | 32K ⭐ | TypeScript | 147K | Game-engine arch, stealth mode as Claude Code | ✅ Published |
| 006 | [**Lightpanda**](lightpanda-browser/) | 27K ⭐ | Zig + Rust | 91K | From-scratch browser for AI agents, 9× Chrome | ✅ Published |
| 007 | [**Hermes Agent**](hermes-agent/) | 26K ⭐ | Python | 260K | Self-improving skills, FTS5 search, frozen mem | ✅ Published |
| 008 | [**oh-my-claudecode**](oh-my-claudecode/) | 24K ⭐ | TypeScript | 194K | 19-agent team via file IPC, Haiku→Opus routing | ✅ Published |
| 009 | [**Guardrails AI**](guardrails-ai/) | 6.6K ⭐ | Python | 18K | Validator Hub, reask self-correction loop | ✅ Published |
| 010 | [**Claude Code**](claude-code/) | 109K ⭐ | TypeScript | 510K | 4-layer context, hidden pet system (18 species) | ✅ Published |

> Projects sorted by GitHub stars (descending).

---

## 🆚 Cross-Project Comparison

We maintain a detailed **[COMPARISON.md](COMPARISON.md)** with side-by-side analysis across all 10 projects:

- Quick Reference (creator, stars, language, type, license)
- Architecture patterns (agent loop, extensibility, deployment)
- Multi-agent & orchestration approaches
- Memory & persistence strategies
- Safety & security postures
- Design patterns and anti-patterns found
- "If I Were Building an Agent Today" synthesis

➡️ **[Read the full comparison →](COMPARISON.md)**

---

## 🎯 What Makes This Different

| Other "awesome" lists | This repo |
|----------------------|-----------|
| Link to repos | **Dissect** repos |
| "What they use" | **Why they chose it** |
| Stars and badges | **Architecture diagrams + trade-off analysis** |
| Surface-level | **Staff-engineer-level depth** |
| Praise everything | **Find real problems** |

---

## 📐 Each Teardown Includes

```
📄 README.md          — Full source code analysis + architecture decisions
⚠️ Problems found     — Bugs, code smells, architectural risks
🆚 Comparisons        — How it stacks up against alternatives
```

---

Video walkthroughs coming soon — follow [@NeuZhou](https://x.com/NeuZhou) on Twitter for updates.

---

## 🗓️ Coming Next

- [ ] Cursor — the most controversial AI IDE
- [ ] everything-claude-code (141K ⭐) — optimizing the harness
- [ ] agency-agents (72K ⭐) — the agent swarm

---

## 🤝 Contributing

Found an error? Have a better analysis? PRs welcome!

- 🐛 Fix factual errors
- 🔍 Add missing architecture details
- 💡 Suggest projects to teardown → [Open an Issue](https://github.com/NeuZhou/awesome-ai-anatomy/issues)
- 🌍 Help translate teardowns

---

## 📌 Stay Updated

New teardown every week. We're working through the top AI agent projects — Cursor, Windsurf, and others are on the list.

**⭐ Star this repo** → GitHub will notify you when new teardowns drop. That's literally what the star button does — it's a subscribe button, not a vanity metric.

**👁️ Watch** → Get notified for every new teardown, not just the ones that trend.

We've published 10 deep-dives covering 2.5M lines of source code. The next 10 are already in progress.

- 🐦 Twitter: [@NeuZhou](https://x.com/NeuZhou) — teardown threads and findings
- 💬 Discord: [Join the community](https://discord.gg/kAQD7Cj8) — discuss architecture decisions

---

<details>
<summary>⚠️ Disclaimer</summary>

These teardowns are independent technical commentary for educational purposes. All code snippets are cited under fair use for criticism, commentary, and education. Project names and trademarks belong to their respective owners. Star counts and LOC figures are snapshots at time of writing and may have changed.

If you're a project maintainer and have concerns about any content, please [open an issue](https://github.com/NeuZhou/awesome-ai-anatomy/issues/new).

</details>

---

<p align="center">
  <i>2.5M lines read. 10 projects dissected. Updated weekly.<br>If you build AI agents, you should know how the best ones actually work.</i>
</p>
