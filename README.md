<p align="center">
  <img src="https://img.shields.io/github/stars/NeuZhou/awesome-ai-anatomy?style=social" alt="Stars">
  <img src="https://img.shields.io/github/forks/NeuZhou/awesome-ai-anatomy?style=social" alt="Forks">
  <img src="https://img.shields.io/badge/teardowns-10-blue" alt="Teardowns">
  <img src="https://img.shields.io/badge/updated-daily-brightgreen" alt="Updated Daily">
  <img src="https://img.shields.io/badge/license-MIT-orange" alt="License">
</p>

# 🔬 Awesome AI Anatomy

**Staff-engineer-level architecture teardowns of the most important AI projects — one per day.**

Most "awesome" lists link to repos. We **dissect** them — architecture diagrams, design decisions, trade-off analysis, God Object code smells, hidden easter eggs, and engineering insights you won't find in the docs.

> ⭐ **Star this repo** to get daily teardowns in your GitHub feed.

---

## 📋 Table of Contents

- [Project Index](#-project-index)
- [Cross-Project Comparison](#-cross-project-comparison)
- [What Makes This Different](#-what-makes-this-different)
- [Each Teardown Includes](#-each-teardown-includes)
- [Coming Next](#️-coming-next)
- [Contributing](#-contributing)
- [Stay Updated](#-stay-updated)

---

## 📊 Project Index

| # | Project | Stars | Language | Lines | Key Findings | Status |
|---|---------|-------|----------|-------|-------------|--------|
| 001 | [**Dify**](dify/) | 136K ⭐ | Python + TS | 1.24M | Visual workflow builder, `graphon` graph engine extraction, 7+ Docker containers, 30+ vector DB support | ✅ Published |
| 002 | [**DeerFlow**](deer-flow/) | 58K ⭐ | Python + TS | — | 14-layer middleware chain, hash-based loop detection (warn@3, kill@5), no auth/RBAC | ✅ Published |
| 003 | [**MiroFish**](mirofish/) | 50K ⭐ | Python + Vue | 39K | LLM-driven social simulation disguised as "collective intelligence," OASIS engine wrapper, ReACT forced-tool-use | ✅ Published |
| 004 | [**Goose**](goose/) | 37K ⭐ | Rust + TS | 198K | MCP-first extension bus, 5-inspector tool inspection pipeline, 30+ LLM providers | ✅ Published |
| 005 | [**Pi Mono**](pi-mono/) | 32K ⭐ | TypeScript | 147K | Game-engine architecture, stealth mode (impersonates Claude Code), clean 7-package monorepo | ✅ Published |
| 006 | [**Lightpanda**](lightpanda-browser/) | 27K ⭐ | Zig + Rust | 91K | From-scratch headless browser for AI agents, 9x faster than Chrome, Zig comptime V8 bindings | ✅ Published |
| 007 | [**Hermes Agent**](hermes-agent/) | 26K ⭐ | Python | 260K | OpenClaw's Python twin, self-improving skill system, FTS5 session search, frozen memory snapshots | ✅ Published |
| 008 | [**oh-my-claudecode**](oh-my-claudecode/) | 24K ⭐ | TypeScript | 194K | 19-agent team orchestration via file-based IPC, model tier routing (Haiku→Opus), Claude Code plugin | ✅ Published |
| 009 | [**Guardrails AI**](guardrails-ai/) | 6.6K ⭐ | Python | 18K | npm-for-validators Hub model, reask loop for LLM self-correction, 1076-line Guard God Object | ✅ Published |
| 010 | [**Claude Code**](claude-code/) | N/A (proprietary) | TypeScript | 510K | 4-layer context management, streaming tool execution, hidden pet system (18 species!), 1729-line God Object | ✅ Published |

> Projects sorted by GitHub stars (descending). Claude Code is proprietary (leaked via source map) so stars are N/A.

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
📄 README.md          — Full architecture analysis + design decisions
📊 *.mmd              — Mermaid diagram source files (select teardowns)
🎬 video-script-*.md  — Video scripts (select teardowns)
🖼️ slides-guide.md    — Slide deck content guide (select teardowns)
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

This repo is updated daily. **Star ⭐ and Watch 👁️ to follow along.**

- 🐦 Twitter: [@NeuZhou](https://x.com/NeuZhou)
- 💬 Discord: [Join the community](https://discord.gg/kAQD7Cj8)

---

<p align="center">
  <i>Daily AI architecture insights from a senior engineer's perspective.</i>
</p>
