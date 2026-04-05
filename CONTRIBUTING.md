# Contributing to Awesome AI Anatomy

Thanks for wanting to contribute! Here's how.

## 🐛 Fix Errors
Found a factual error in a teardown? Open a PR with:
- The specific claim that's wrong
- Evidence of the correct information
- Link to source code or documentation

## 🔍 Enhance Existing Teardowns
- Add missing architecture details
- Improve Mermaid diagrams
- Add benchmark data
- Translate to another language

## 💡 Suggest a Project to Teardown
Open an issue with the `project-suggestion` label:
- Project name and repo URL
- Why it's architecturally interesting
- Approximate lines of code
- What questions you'd want answered

## ✍️ Write a New Teardown
1. Fork the repo
2. Create `project-name/README.md` using [TEMPLATE.md](TEMPLATE.md)
3. Run through the quality checklist at the bottom of the template
4. Submit PR

## Quality Standards
- All claims must be verifiable from source code
- Opinions must be clearly labeled as opinions
- Architecture diagrams must use Mermaid (GitHub renders natively)
- Comparisons must be fair and evidence-based
- No AI-generated filler — every paragraph must add value

## Knowledge Base Contributions
If you find a new design pattern or anti-pattern during a teardown:
1. Create a YAML file in `knowledge/patterns/` or `knowledge/anti-patterns/`
2. Follow the existing YAML format
3. Reference the specific project and file path where you found it
