# Context Architect

A Claude Code plugin that audits and designs project context files.
Enforces role separation, minimal injection, hierarchical indexing, and knowledge diff.

## Install

```bash
claude plugin add context-architect
```

Or manual: clone this repo and add to your Claude Code plugin settings.

## Usage

Three modes, all invoked via `/context-architect`:

**CREATE** -- Run on a new project. Designs a two-layer context architecture
(root CLAUDE.md as index, scoped docs for domain knowledge).

**AUDIT** -- Run on an existing project. Performs 4-phase analysis
(structure, docs, links, knowledge diff) and produces a CCS score with fix recommendations.

**UPDATE** -- Run after project changes. Classifies what changed and syncs
context files to reflect the current state.

## Tools

CLI tools for automated analysis:

```bash
node tools/ccs-score.mjs .                                     # Context Complexity Score
node tools/detect-antipatterns.mjs --phase structure --root .   # Anti-pattern detection
node tools/knowledge-probe.mjs --root . --extract               # Statement extraction
```

Or via npm scripts:

```bash
npm run ccs -- .
npm run antipatterns -- --phase structure --root .
npm run probe -- --root . --extract
```

## Configuration

Optional `.context-architect.json` in project root:

```json
{
  "context_files": ["CLAUDE.md", ".claude/**"],
  "reference_docs": ["src/auth/ARCHITECTURE.md"],
  "ignore": ["docs/plans/**"],
  "probe_model": "sonnet"
}
```

## Philosophy

Structure over volume. Research shows static monolithic context files do not
reliably improve agent performance. Context Architect uses hierarchical
indexing -- CLAUDE.md as a map, domain docs as on-demand content -- combined
with knowledge diff to verify what the AI actually needs to be told versus
what it can already infer from code.

## License

MIT
