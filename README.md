# Context Architect

A Claude Code plugin that audits and designs project context files.
Enforces role separation, minimal injection, hierarchical indexing, and knowledge diff.

## Install

**Global** — available in all projects:

```bash
claude plugin add --global github:fbwndrud/context-architect
```

**Project-only** — scoped to the current project:

```bash
claude plugin add github:fbwndrud/context-architect
```

## Usage

Invoke via `/context-architect` in any project:

**CREATE** — Design a two-layer context architecture for a new project.
Generates a root `CLAUDE.md` index and scoped reference docs for domain knowledge.

**AUDIT** — Analyze an existing project's context files.
Runs 4-phase analysis (structure, docs, links, knowledge diff) and produces a CCS score with fix proposals.

**UPDATE** — Sync context files after project changes.
Classifies what changed and updates context while enforcing the Iron Law.

## Tools

The plugin includes CLI tools for automated analysis. When invoked from skills, tools are resolved via `${CLAUDE_PLUGIN_ROOT}`:

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/ccs-score.mjs .
node ${CLAUDE_PLUGIN_ROOT}/tools/detect-antipatterns.mjs --phase structure --root .
node ${CLAUDE_PLUGIN_ROOT}/tools/knowledge-probe.mjs --root . --extract
```

## Configuration

Optional `.context-architect.json` in your project root:

```json
{
  "context_files": ["CLAUDE.md", ".claude/**"],
  "reference_docs": ["src/auth/ARCHITECTURE.md"],
  "ignore": ["docs/plans/**"],
  "probe_model": "sonnet"
}
```

| Field | Description |
|-------|-------------|
| `context_files` | Additional Layer 1 files to include in scope |
| `reference_docs` | Additional Layer 2 files to include in scope |
| `ignore` | Globs to exclude from analysis |
| `probe_model` | Model for Knowledge Diff sub-agent (default: `sonnet`) |

## Philosophy

Structure over volume. Static monolithic context files do not reliably improve agent performance.
Context Architect uses hierarchical indexing — `CLAUDE.md` as a map, domain docs as on-demand content — combined with knowledge diff to verify what the AI actually needs to be told versus what it can already infer from code.

## References

- [Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?](https://arxiv.org/pdf/2602.11988)
- [The Complete Guide to Claude Code: 70 Tips](https://drive.google.com/file/d/1x2x1T4lzTISnHGN8nd4KtMhL8iwi6QgU/view)
- [OpenClaw](https://github.com/openclaw/openclaw)

## License

MIT
