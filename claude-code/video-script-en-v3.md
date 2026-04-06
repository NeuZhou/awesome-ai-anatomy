# Claude Code Teardown — English Video Script (Final v3)

## Input document for NotebookLM

---

The most advanced AI coding agent in the world has a built-in virtual pet system.

18 species. 5 rarity tiers. RPG stats including DEBUGGING, PATIENCE, CHAOS, WISDOM, and SNARK. A 1% chance of getting a shiny variant.

I'm not kidding. This is Anthropic's Claude Code. 510,000 lines of production source code, accidentally leaked last week.

And the leak itself? Embarrassingly simple. Someone found a leftover source map file in the npm package. Inside was a link to Anthropic's cloud storage. No authentication. Click, download, unzip — 1,903 files of complete, unobfuscated TypeScript. The full source code of what might be the most capable AI coding agent ever built.

I spent days reading through all of it. The pet system is just the appetizer. What actually blew my mind was the architecture.

Let me break it down in three levels.

Level 1: Smart, but you could probably guess.

The terminal UI is built with React. Yes, React — in a CLI tool. They use a framework called Ink that renders React components to the terminal. Sounds crazy until you think about what Claude Code's UI actually needs to handle: multiple agents running in parallel, streaming outputs, user interrupts, permission dialogs. That's complex state management. React's declarative model is arguably the least bad option here.

The core agent loop is a single while-true loop in one file — query.ts, 1,729 lines. Preprocess context, call the API, detect tool calls in the stream, execute them, append results, loop back. Simple in concept.

But the devil is in Level 2.

Level 2: The stuff that surprised me.

Context management. When conversations get long, most AI tools just truncate — chop off the oldest messages. Claude Code doesn't. It has four layers of compression, each more aggressive than the last.

Think of it like cleaning up your phone when storage is full. First you delete apps you don't use. Then you clear cache. Then you compress old photos to the cloud. And only as a last resort, you factory reset.

Claude Code works the same way. Layer 1: surgically delete specific messages that are no longer relevant — no summarization, just clean removal. Layer 2: edit at the API cache level — the content stays but the model is told to ignore certain tokens. Layer 3: archive old conversation turns into structured summaries, like git commit messages. Layer 4: brute-force compress everything. Nuclear option.

These layers fire in sequence. If layers 1 and 2 get the context small enough, layers 3 and 4 never activate.

Why does this matter? Because it embodies a principle that most AI tools ignore: lossless before lossy, local before global. Most tools only have layer 4. Claude Code has all four. That's why it handles long conversations better than anything else I've used.

The second Level 2 surprise: streaming tool execution.

Normal AI agents wait for the model to finish generating, then check for tool calls, then execute them. Claude Code starts executing tools while the model is still talking. Read-only operations like file reads and grep run in parallel. Write operations get an exclusive lock.

This is why Claude Code feels faster than competitors. It's not that the model is faster. It's that the engineering eliminates dead time between turns.

Level 3: Things I absolutely did not expect to find.

Beyond the pet system, there's a complete voice mode — internal codename "Amber Quartz." There's a bridge mode that turns your local machine into a remote terminal for Claude's web interface. And there's ablation testing infrastructure — the ability to systematically disable features and measure their individual contribution to performance.

That last one is what impressed me most. Most companies do A/B tests. Claude Code's team does ablation studies. That's a methodology from machine learning research papers — remove components one by one and measure the impact. Almost nobody does this in production engineering.

It tells me this team isn't just building a product. They're using research methodology to build a product. Every feature has quantified evidence for why it exists.

Except the pet system. That one's just for fun.

Here's a fun detail, by the way. All 18 pet species names are hex-encoded in the source code. Why? Because one of them collides with an unreleased Anthropic model codename. The build system scans output files for excluded strings, so they encoded everything to avoid triggering the filter.

Which name is it? Duck, goose, blob, cat, dragon, octopus, owl, penguin, turtle, snail, ghost, axolotl, capybara, cactus, robot, rabbit, mushroom, chonk. One of these is the codename for Anthropic's next model. Nobody's confirmed which one yet.

Now let me give you a hot take that might be controversial.

After reading the entire codebase, I think Claude Code is overengineered.

Four layers of context management. 40+ tools. A dual-layer feature flag system. Ablation testing infrastructure. A virtual pet system. A 1,729-line single-file core loop.

For a research-oriented team, this makes sense — they need to measure everything. But for whoever has to maintain this codebase in two years? It might be a nightmare. There's a fine line between "sophisticated engineering" and "complexity that will bite you." I think Claude Code is walking that line.

And about the leak itself.

The npm publish included source map files. The source maps contained a URL to a zip file on Cloudflare R2. The URL had no access control. That's it. 510,000 lines of core product source code, exposed by a forgotten file.

If you publish npm packages: whitelist your files in package.json. Add a CI step to check for .map files in your build artifacts. And for the love of engineering, put authentication on your source archive URLs.

So what's the biggest takeaway from reading half a million lines of production agent code?

It's not any single technical trick. It's the culture.

This team treats engineering like research. Every feature is quantified. Every design decision has an explicit trade-off analysis. That "research-driven engineering culture" is worth more than any architecture pattern. It's what separates good products from great ones.

This is the first episode of awesome-ai-anatomy — a project where we dissect the architecture of important AI projects, one at a time. Next up: ByteDance's DeerFlow. Star the repo on GitHub if you want the next one.
