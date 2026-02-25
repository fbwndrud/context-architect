# UPDATE Mode

Update context architecture after project changes while maintaining structural integrity.
Lighter than AUDIT (no full 4-phase analysis) but enforces the same principles — role separation, minimal injection, and the Iron Law.

## Purpose

Projects evolve. When code, dependencies, conventions, or team processes change, context files may need to sync. UPDATE mode handles targeted updates without re-running a full audit. The goal: keep context accurate and minimal after each change.

## Trigger Analysis

Before making any changes, identify what triggered the update:

### What Changed?

| Change Type | Examples |
|---|---|
| **New feature** | New module, API endpoint, service integration |
| **Refactor** | Renamed paths, restructured directories, extracted modules |
| **Dependency change** | New framework, removed library, major version upgrade |
| **Team convention change** | New code review rules, updated deploy process, style guide update |
| **Infrastructure change** | New CI/CD pipeline, environment config, deploy target |

### Which Layer Is Affected?

| Impact | Layer 1 (Index) | Layer 2 (Reference Docs) |
|---|---|---|
| New topic area | Add index entry + link | Create new reference doc |
| Changed details within existing topic | No change needed | Update reference doc content |
| Removed feature/convention | Remove index entry | Remove or archive reference doc |
| Renamed/moved files | Update link paths | Move doc to new location |
| Changed scope (topic split/merge) | Restructure entries | Split or merge docs |

---

## Process

### Step 1: Classify the Change

Determine whether the change belongs in context files at all:

| Classification | Criteria | Action |
|---|---|---|
| **Static change** | Permanent decision, convention, or architecture choice | Update context files (CLAUDE.md and/or reference docs) |
| **Dynamic change** | Session-specific, temporary, or experimental | Add to MEMORY.md or skip entirely |
| **Unclear** | Not sure if permanent or temporary | Ask the user before proceeding |

Examples:

| Change | Classification | Reason |
|---|---|---|
| "We switched from Jest to Vitest" | Static | Permanent tooling decision |
| "I'm experimenting with a new API pattern" | Dynamic | Temporary — don't pollute context |
| "We're migrating to monorepo" | Unclear | In progress — ask user if it's finalized |
| "New deploy script at `./scripts/deploy-v2.sh`" | Static | Permanent operational change |
| "Using feature flag for dark mode" | Dynamic | Temporary — will resolve to static later |

**If dynamic:** add to MEMORY.md (if it exists) or skip. Do NOT update CLAUDE.md or reference docs with temporary information.

### Step 2: Apply 3 Tests

Before adding any new content, run the same 3 tests used in CREATE and AUDIT modes:

| Test | Question | If YES |
|------|----------|--------|
| **Public Knowledge** | Can an AI find this in public documentation? | Don't add |
| **Default vs Custom** | Is this the standard/default behavior for the framework? | Don't add |
| **Discoverable** | Can an AI learn this by reading the code itself? | Don't add |

**Decision rule:** If ALL 3 tests say "AI knows this" — don't add it to context. Only add items that are project-specific, non-obvious, and not discoverable from code alone.

Examples after a dependency change:

| Item | Public? | Default? | Discoverable? | Add? |
|------|---------|----------|---------------|------|
| "We now use Prisma for DB access" | Yes | - | Yes (package.json) | No |
| "Prisma schema uses custom `cuid2` ID generator" | No | No | Partially | **Yes** |
| "Migrations require VPN to staging DB" | No | No | No | **Yes** |
| "Prisma supports relations" | Yes | Yes | Yes | No |

### Step 3: Determine Action

Based on classification and test results, choose the appropriate action:

**Adding a new item:**
- Does it need an index entry? (Is it a new topic area?)
- Does it need a reference doc? (Is there enough depth beyond a one-liner?)
- Where should the doc live? (Colocate with relevant code when possible)

**Modifying an existing item:**
- Is the file still single-role after the change?
- Is the file still under 200 lines after the change?
- If either answer is no → restructure before modifying (see Anti-Append Rule below)

**Removing an item:**
- Remove from reference doc first
- Remove index entry if the entire topic is gone
- Check for broken links after removal (Step 4 handles this)

### Step 4: Link Integrity Check

After making changes, verify all links between Layer 1 and Layer 2 are still valid:

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/detect-antipatterns.mjs --phase links --root .
```

This catches:
- **Broken links** — index references a file that no longer exists (moved, renamed, deleted)
- **Orphan docs** — reference docs not linked from any index file

Fix any issues before proceeding.

### Step 5: Quick CCS Check

Run a lightweight CCS calculation to ensure the update didn't degrade context quality:

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/ccs-score.mjs --root .
```

**If the score increased** (context quality degraded), warn the user with a before/after comparison:

```
CCS Impact:
  Before: 2 (Safe)
  After:  4 (Risk)
  Delta:  +2

New issues detected:
  [WARNING] docs/CONVENTIONS.md: approaching fat doc (187 lines)
  [WARNING] CLAUDE.md: index-content leak (embedded deploy steps)

Recommendation: Restructure before applying this update.
```

**If the score stayed the same or decreased** — proceed normally.

### Step 6: Present Changes

Present all proposed modifications to the user for approval. Do NOT apply changes until the user explicitly approves.

Show:
1. **Proposed diffs** — exact changes to each file
2. **CCS impact** — before and after scores with rating
3. **New files** — any new reference docs with header-first templates
4. **Removed content** — what's being deleted and why

Format:

```
## Proposed Update

### Modified: CLAUDE.md
[diff showing changes]

### Modified: docs/DEPLOY.md
[diff showing changes]

### CCS Impact: 3 (Risk) → 2 (Safe)

Approve? [Y/n]
```

Wait for user approval before applying any changes.

---

## Anti-Append Rule

```
Before adding content, ask: should I restructure instead of append?
If a file is approaching 200 lines or mixing roles, restructure first.
```

This is the most important rule in UPDATE mode. The natural tendency is to append new content to existing files. This leads to:

- **Fat docs** — files that grow past 200 lines and become hard to navigate
- **Role soup** — files that gradually accumulate unrelated topics
- **Index-content leaks** — CLAUDE.md that slowly fills with actual content instead of links

### When to Restructure Instead of Append

| Signal | Action |
|---|---|
| File is over 150 lines and you're adding more | Split into focused docs first |
| File covers 3+ unrelated topics | Extract topics into separate docs |
| CLAUDE.md section has more than 2 lines of content | Extract to a reference doc, replace with link |
| Adding content that doesn't match the file's header/purpose | Create a new file instead |

### Example: Restructure vs Append

Bad (append):
```markdown
# CLAUDE.md
## Deployment
Deploy with `./scripts/deploy.sh staging`. Requires VPN.
New: For production, use `./scripts/deploy.sh prod --confirm`.
New: Rollback with `./scripts/rollback.sh <version>`.
New: Canary deploys use `./scripts/deploy.sh canary --percentage 10`.
```

Good (restructure):
```markdown
# CLAUDE.md
## Deployment
Multi-stage deploy pipeline with canary support — see [deploy guide](docs/DEPLOY.md)
```

With a new reference doc:
```markdown
# Deployment Guide
Multi-stage deployment pipeline with VPN requirement and canary support.

## Environments
...

## Rollback
...

## Canary Deploys
...
```

---

## Process Summary

```
1. Identify what changed and which layer is affected
2. Classify the change (static / dynamic / unclear)
3. Apply 3 tests to every new item
4. Determine action (add / modify / remove)
5. Check link integrity          → detect-antipatterns.mjs --phase links
6. Quick CCS check               → ccs-score.mjs
7. Present changes with diffs and CCS impact
8. Apply only after user approval
```

## Reminders

- **User language rule:** All user-facing output MUST be in the user's language.
- **No changes without approval:** Present proposals, wait for explicit approval, then apply.
- **Iron Law applies:** Every piece of context must justify its presence. Updates are not exempt.
- **Anti-Append Rule:** Always consider restructuring before adding. Files grow; discipline prevents bloat.
- **Dynamic stays dynamic:** Never put temporary or session-specific information into static context files.
- **`${CLAUDE_PLUGIN_ROOT}` resolution:** When running tool commands, resolve `${CLAUDE_PLUGIN_ROOT}` to the plugin's actual installation directory.
