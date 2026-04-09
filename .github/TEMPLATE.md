# Teardown Template — awesome-ai-anatomy

> Use this template for every project teardown. Sections marked [REQUIRED] must be included. Sections marked [IF APPLICABLE] can be skipped if not relevant.

---

# {Project Name}: {One-Line Hook That Makes People Click}

> {1-2 sentences: what you found, why it matters, stated as personal experience}

## At a Glance [REQUIRED]

| Metric | Value |
|--------|-------|
| Stars | {verified via GitHub API} |
| Forks | {verified via GitHub API} |
| Language | {primary language(s)} |
| Framework | {key frameworks used} |
| Lines of Code | {verified via cloc/wc -l} |
| License | {license type} |
| First Commit | {date} |
| Latest Release | {version + date} |

{2-3 sentences: what this project IS in plain language. No marketing speak. What does it actually do when you run it?}

---

## Architecture [REQUIRED]

```mermaid
{Overall architecture diagram — flowchart showing main components and data flow}
```

{Explain the architecture in 2-3 paragraphs. Focus on:
- What are the main components?
- How do they communicate?
- Why was it designed this way?
- Include personal reaction: what surprised you?}

**Files to reference:**
- `{path/to/main/entry/point}` — {what it does}
- `{path/to/key/module}` — {what it does}

---

## Core Innovation [REQUIRED]

{What is the 1-2 things this project does that others don't? This is the section that makes people share the teardown.}

{Include code snippets with file paths and line numbers:}

```python
# From {file_path}:{line_number}
{actual code from the project}
```

{Explain WHY this matters, not just WHAT it does.}

---

## How It Actually Works [REQUIRED]

{Deep dive into the mechanics. Pick 2-3 subsystems to analyze in detail.}

### {Subsystem 1 Name}

```mermaid
{Diagram for this subsystem — sequence diagram, state machine, or flowchart}
```

{Analysis: how it works, key design decisions, trade-offs}

### {Subsystem 2 Name}

{Same structure: diagram + analysis}

### {Subsystem 3 Name} [IF APPLICABLE]

{Same structure: diagram + analysis}

---

## The Verdict [REQUIRED]

{NOT separated into "pros" and "cons" lists. Write this as flowing paragraphs mixing positives and negatives naturally. Be opinionated — say what you actually think.}

{Include at least:
- 2-3 things that are genuinely well-designed (with specific evidence)
- 2-3 things that are problematic (with specific evidence)
- Your overall assessment: would you use this? recommend it? contribute to it?}

---

## Cross-Project Comparison [REQUIRED after 3+ teardowns]

| Feature | {This Project} | {Project A} | {Project B} |
|---------|---------------|-------------|-------------|
| {Feature 1} | {value} | {value} | {value} |
| {Feature 2} | {value} | {value} | {value} |
| ... | ... | ... | ... |

{Brief analysis: where does this project sit in the landscape?}

---

## Stuff Worth Stealing [REQUIRED]

{2-3 design patterns or techniques that are worth adopting in your own projects. Be specific — link to the exact code.}

---

## Hooks & Easter Eggs [IF FOUND]

{Any surprising discoveries: hidden features, funny comments, unusual design choices, Easter eggs. These are the most shareable parts of any teardown.}

---

## Verification Log [REQUIRED — at end of file, collapsed]

<details>
<summary>Fact-check log (click to expand)</summary>

| Claim | Verification Method | Result |
|-------|-------------------|--------|
| {star count} | GitHub API | ✅ Verified |
| {LOC count} | cloc output | ✅ Verified |
| {file path reference} | file exists check | ✅ Verified |
| ... | ... | ... |

</details>

---

*Part of [awesome-ai-anatomy](https://github.com/NeuZhou/awesome-ai-anatomy) — source-level teardowns of how production AI systems actually work.*

---

## Template Usage Notes (delete this section in actual teardowns)

### Quality Checklist
- [ ] All numbers verified (stars, LOC, dates)
- [ ] All file paths verified to exist
- [ ] At least 3 Mermaid diagrams
- [ ] At least 5 code snippets with file:line references
- [ ] Cross-project comparison table included
- [ ] Verification log complete
- [ ] Passed AI tone review (no "remarkably", "genuinely", "innovative", etc.)
- [ ] Has at least 1 personal reaction/experience
- [ ] Verdict section mixes positives and negatives (not separated lists)
- [ ] Hook/title would make someone click on HN

### Banned Words/Phrases
- remarkably, genuinely, innovative, cleverly, elegant
- "it's worth noting", "interestingly", "notably"
- "a testament to", "speaks volumes"
- "the elephant in the room"
- "deep-dive" (in title/subtitle)
- Any three-adjective ending ("Simple, powerful, effective.")

### Title Formula
- "{Project}: {Surprising Finding}" — e.g., "Claude Code: There's a Hidden Tamagotchi in Anthropic's AI"
- "{Project}: {Contrarian Take}" — e.g., "Hermes Agent: OpenClaw's Python Twin With a Learning Loop Bolted On"
- Never use "A Deep Dive Into..." or "Understanding..."
