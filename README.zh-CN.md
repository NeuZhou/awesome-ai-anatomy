<p align="center">
  <img src="assets/hero-banner.png" alt="Awesome AI Anatomy" width="100%">
</p>

<p align="center">
  <a href="README.md">English</a> | <b>简体中文</b>
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/NeuZhou/awesome-ai-anatomy?style=social" alt="Stars">
  <img src="https://img.shields.io/github/forks/NeuZhou/awesome-ai-anatomy?style=social" alt="Forks">
  <img src="https://img.shields.io/badge/teardowns-13-blue" alt="Teardowns">
  <img src="https://img.shields.io/badge/updated-weekly-brightgreen" alt="Updated Weekly">
  <img src="https://img.shields.io/badge/license-MIT-orange" alt="License">
</p>

# Awesome AI Anatomy

**13 个 AI Agent 项目，逐一解剖。有的藏了宠物系统，有的安全等于裸奔，所有项目都有 God Object。**

Claude Code 在生产代码里塞了 18 种虚拟宠物。Pi Mono 可以伪装成 Claude Code 来绕过速率限制。MiroFish 吹的"集体智慧"不过是 LLM 在一个假社交网络上角色扮演。这些不是嘴炮——都是我们逐行读代码读出来的。

大多数 "awesome" 列表只是贴个链接。我们直接把项目拆开——Architecture 图、设计取舍、代码坏味道、安全漏洞，以及那些文档里永远不会提到的工程决策。

---

## 目录

- [最劲爆发现](#最劲爆发现)
- [项目索引](#项目索引)
- [跨项目对比](#跨项目对比)
- [和其他项目有什么不同](#和其他项目有什么不同)
- [每篇拆解包含](#每篇拆解包含)
- [下一批](#下一批)
- [参与贡献](#参与贡献)
- [保持关注](#保持关注)

---

## 最劲爆发现

被转发最多的 5 个发现：

| # | 发现 | 项目 | 为什么重要 |
|---|------|------|-----------|
| 1 | **Claude Code 里藏了 18 种虚拟宠物** —— 一个完整的电子宠物系统，藏在一个编程 Agent 里 | [Claude Code](claude-code/) | 你用 `sudo` 跑的工具里还藏了什么？ |
| 2 | **Pi Mono 的"隐身模式"伪装成 Claude Code** —— 伪造工具名来绕过速率限制 | [Pi Mono](pi-mono/) | 开源项目钻 API 提供商空子已经成趋势了 |
| 3 | **MiroFish 的"集体智慧" = 零集体智慧** —— 本质是 LLM 在模拟社交网络上扮演人类 | [MiroFish](mirofish/) | 5 万 Star 靠营销堆出来的，不是靠名字暗示的那个技术 |
| 4 | **Lightpanda 的 bitcast dispatch** 让 Zig 表现得像有 vtable 的语言——一个我们从没见过的系统级骚操作 | [Lightpanda](lightpanda-browser/) | Zig comptime 元编程被推到了极限 |
| 5 | **DeerFlow 的 orphan tool call bug** —— 93 行代码修复了一个会让所有基于 LangGraph 的 Agent 崩溃的问题 | [DeerFlow](deer-flow/) | 如果你在用 LangGraph，你大概率也有这个 Bug |

> 这些都是读源代码读出来的真实发现，不是看 README 文件脑补出来的。

---

## 项目索引

13 份 AI Agent 源代码深度分析——从编排框架到编程助手。

| # | 项目 | Stars | 语言 | 代码行数 | 关键发现 | 状态 |
|---|------|-------|------|---------|---------|------|
| 001 | [**Dify**](dify/) | 136K | Python + TS | 1.24M | `graphon` 引擎、7+ 容器、30+ 向量数据库 | 已发布 |
| 002 | [**Claude Code**](claude-code/) | 109K | TypeScript | 510K | 4 层 Context、隐藏的宠物系统（18 个物种） | 已发布 |
| 003 | [**OpenHands**](openhands/) | 71K | Python + TS | 400K | 10 种 Condenser、3 层安全体系、487 行卡住检测器、V0/V1 迁移中 | **新增** |
| 004 | [**DeerFlow**](deer-flow/) | 58K | Python + TS | — | 14 层中间件、hash 循环 kill@5、无 RBAC | 已发布 |
| 005 | [**MiroFish**](mirofish/) | 50K | Python + Vue | 39K | LLM 社交模拟冒充"集体智慧" | 已发布 |
| 006 | [**Goose**](goose/) | 37K | Rust + TS | 198K | MCP-first 总线、5 级 Inspector Pipeline、30+ LLM | 已发布 |
| 007 | [**Pi Mono**](pi-mono/) | 32K | TypeScript | 147K | 游戏引擎架构、伪装成 Claude Code 的隐身模式 | 已发布 |
| 008 | [**Lightpanda**](lightpanda-browser/) | 27K | Zig + Rust | 91K | 为 AI Agent 从零造的浏览器、比 Chrome 快 9 倍 | 已发布 |
| 009 | [**Hermes Agent**](hermes-agent/) | 26K | Python | 260K | 自进化 Skill、FTS5 搜索、冻结内存 | 已发布 |
| 010 | [**oh-my-claudecode**](oh-my-claudecode/) | 24K | TypeScript | 194K | 19 个 Agent 通过文件 IPC 协作、Haiku→Opus 路由 | 已发布 |
| 011 | [**Guardrails AI**](guardrails-ai/) | 6.6K | Python | 18K | Validator Hub、reask 自修正循环 | 已发布 |
| 012 | [**OpenAI Codex CLI**](codex-cli/) | 27K+ | Rust | 549K | Queue-pair 架构、Guardian AI 审批、3 平台沙箱 | 已发布 |
| 013 | [**Cline**](cline/) | 60K | TypeScript | 560K | 3,756 行 God Object、40+ Provider、YOLO 模式、Hooks 系统 | **新增** |

按 GitHub Star 数降序排列。

---

## 跨项目对比

我们维护了一份详细的 **[COMPARISON.md](COMPARISON.md)**，对 13 个项目进行横向分析：

- 速查表（作者、Star 数、语言、类型、许可证）
- Architecture 模式（Agent 循环、扩展性、部署方式）
- Multi-Agent 与编排方案
- 记忆与持久化策略

另外还有 **[CROSS-CUTTING.md](CROSS-CUTTING.md)** —— 深度横向分析：

- 所有项目的 Architecture 模式分类
- Context 管理策略对比
- 工具系统设计模式
- 安全评级（A-F）
- 反模式目录（附代码证据）
- "从零造 Agent" 的综合建议

**[查看完整对比 →](COMPARISON.md)**

---

## 和其他项目有什么不同

| 别的 "awesome" 列表 | 这个仓库 |
|-------------------|---------|
| 贴个链接 | **拆开来看** |
| "他们用了啥" | **为啥选这个** |
| Star 数和 Badge | **Architecture 图 + 取舍分析** |
| 浮在表面 | **Staff Engineer 级别的深度** |
| 什么都夸 | **找真问题** |

---

## 每篇拆解包含

- `README.md` — 完整的源代码分析 + Architecture 决策
- 发现的问题 — Bug、代码坏味道、架构风险
- 对比 — 和同类方案的横向对比

---

## 下一批

- [ ] browser-use (86K stars) — AI 浏览器自动化，Python
- [ ] Crush (22K stars) — OpenCode 的继任者，Charm 团队出品（Bubble Tea）
- [ ] Cursor — 争议最大的 AI IDE（闭源，仅部分分析）

---

## 参与贡献

发现错误？有更好的分析？欢迎提 PR。

- 修正事实错误
- 补充遗漏的 Architecture 细节
- 推荐想拆解的项目 → [提 Issue](https://github.com/NeuZhou/awesome-ai-anatomy/issues)
- 帮忙翻译 Teardown

---

## 保持关注

每周更新一篇新 Teardown。Cursor 等项目都在计划中。

**Star 这个仓库** — GitHub 会在新 Teardown 发布时通知你。

**Watch** — 每篇新 Teardown 都会收到通知。

已经发布了 13 篇深度拆解。下一批已经在路上了。

- Substack: [AI Anatomy Newsletter](https://neuzhou.substack.com) — 精简版 Teardown，直达你的收件箱
- Discord: [加入社区](https://discord.gg/kAQD7Cj8) — 讨论 Architecture 决策

---

<details>
<summary>免责声明</summary>

这些 Teardown 是独立的技术评论，仅用于教育目的。所有代码片段的引用均属于合理使用范畴（批评、评论和教育）。项目名称和商标归各自所有者所有。Star 数和代码行数为撰写时的快照，可能已发生变化。

如果你是项目维护者，对任何内容有疑虑，欢迎[提 Issue](https://github.com/NeuZhou/awesome-ai-anatomy/issues/new)。

</details>

---

<p align="center">
  <i>拆了 13 个项目。每周更新。<br>如果你在做 AI Agent，你应该知道最好的那些到底是怎么造的。</i>
</p>
