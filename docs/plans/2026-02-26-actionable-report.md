# Actionable Report Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `token-estimate.mjs` CLI tool and enhance audit-mode.md so the AUDIT report shows concrete token impact, structure proposals, and deletion diffs.

**Architecture:** New CLI tool `token-estimate.mjs` provides deterministic token estimation (chars/4). The `audit-mode.md` skill is enhanced with three new report sections: token impact, structure proposals, and deletion diffs with user approval controls.

**Tech Stack:** Node.js ESM, node:test, zero external dependencies

---

### Task 1: Add `estimateTokens` — failing tests

**Files:**
- Create: `tests/tools/token-estimate.test.mjs`

**Step 1: Write the failing tests**

Create the file with the following content:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { estimateTokens } from '../../tools/token-estimate.mjs';

describe('estimateTokens', () => {
  it('returns token estimate for clean project', async () => {
    const result = await estimateTokens('tests/fixtures/clean-project');
    assert.equal(typeof result.total_chars, 'number');
    assert.equal(typeof result.estimated_tokens, 'number');
    assert.ok(result.total_chars > 0);
    assert.equal(result.estimated_tokens, Math.ceil(result.total_chars / 4));
  });

  it('includes per-file breakdown with roles', async () => {
    const result = await estimateTokens('tests/fixtures/clean-project');
    assert.ok(Array.isArray(result.files));
    assert.ok(result.files.length > 0);
    const first = result.files[0];
    assert.equal(typeof first.file, 'string');
    assert.equal(typeof first.chars, 'number');
    assert.equal(typeof first.tokens, 'number');
    assert.ok(['index', 'linked'].includes(first.role));
  });

  it('classifies context file as index', async () => {
    const result = await estimateTokens('tests/fixtures/clean-project');
    const index = result.files.find(f => f.file.endsWith('CLAUDE.md'));
    assert.ok(index);
    assert.equal(index.role, 'index');
  });

  it('classifies linked docs as linked', async () => {
    const result = await estimateTokens('tests/fixtures/clean-project');
    const linked = result.files.find(f => f.role === 'linked');
    assert.ok(linked, 'should have at least one linked doc');
  });

  it('returns zero for missing CLAUDE.md', async () => {
    const result = await estimateTokens('tests/fixtures');
    assert.equal(result.total_chars, 0);
    assert.equal(result.estimated_tokens, 0);
    assert.deepEqual(result.files, []);
  });

  it('calculates tokens as Math.ceil(chars / 4)', async () => {
    const result = await estimateTokens('tests/fixtures/clean-project');
    for (const f of result.files) {
      assert.equal(f.tokens, Math.ceil(f.chars / 4));
    }
  });

  it('total_chars equals sum of file chars', async () => {
    const result = await estimateTokens('tests/fixtures/clean-project');
    const sum = result.files.reduce((acc, f) => acc + f.chars, 0);
    assert.equal(result.total_chars, sum);
  });

  it('respects contextFile option', async () => {
    const result = await estimateTokens('tests/fixtures/clean-project', { contextFile: 'CLAUDE.md' });
    assert.ok(result.total_chars > 0);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `eval "$(fnm env)" && node --test tests/tools/token-estimate.test.mjs`
Expected: FAIL — `token-estimate.mjs` does not exist

**Step 3: Commit**

```bash
git add tests/tools/token-estimate.test.mjs
git commit -m "test: add failing tests for estimateTokens"
```

---

### Task 2: Implement `estimateTokens`

**Files:**
- Create: `tools/token-estimate.mjs`

**Step 1: Create the implementation**

```js
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadConfig, resolveContextFile, fileExists } from './lib/config.mjs';

/**
 * Estimate token count for context files in a project.
 *
 * Scans the context file (index) and all linked docs,
 * returning character counts and token estimates (chars / 4).
 *
 * @param {string} rootPath — path to project root
 * @param {object} [options]
 * @param {string} [options.contextFile] — override context file path
 * @returns {Promise<{ total_chars: number, estimated_tokens: number, files: Array<{ file: string, chars: number, tokens: number, role: string }> }>}
 */
export async function estimateTokens(rootPath, options = {}) {
  const root = path.resolve(rootPath);
  const config = await loadConfig(root);
  const ctxPath = resolveContextFile(root, options.contextFile, config);

  let ctxContent;
  try {
    ctxContent = await fs.readFile(ctxPath, 'utf8');
  } catch {
    return { total_chars: 0, estimated_tokens: 0, files: [] };
  }

  const files = [];

  // Index file
  const ctxChars = ctxContent.length;
  files.push({
    file: ctxPath,
    chars: ctxChars,
    tokens: Math.ceil(ctxChars / 4),
    role: 'index',
  });

  // Extract relative links from context file
  const linkRe = /\[.*?\]\(((?!https?:\/\/).*?)\)/g;
  let m;
  while ((m = linkRe.exec(ctxContent)) !== null) {
    const abs = path.resolve(root, m[1]);
    if (!(await fileExists(abs))) continue;

    let content;
    try {
      content = await fs.readFile(abs, 'utf8');
    } catch {
      continue;
    }

    const chars = content.length;
    files.push({
      file: abs,
      chars,
      tokens: Math.ceil(chars / 4),
      role: 'linked',
    });
  }

  const total_chars = files.reduce((sum, f) => sum + f.chars, 0);

  return {
    total_chars,
    estimated_tokens: Math.ceil(total_chars / 4),
    files,
  };
}

// ── CLI entry point ───────────────────────────────────────────────────────

const isMain = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

if (isMain) {
  const args = process.argv.slice(2);
  let rootPath = '.';
  let contextFile;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--root' && args[i + 1]) {
      rootPath = args[++i];
    } else if (args[i] === '--context-file' && args[i + 1]) {
      contextFile = args[++i];
    }
  }

  estimateTokens(rootPath, { contextFile })
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(err => {
      console.error(err.message);
      process.exit(2);
    });
}
```

**Step 2: Run tests to verify they pass**

Run: `eval "$(fnm env)" && node --test tests/tools/token-estimate.test.mjs`
Expected: ALL PASS (8 tests)

**Step 3: Commit**

```bash
git add tools/token-estimate.mjs
git commit -m "feat: add token-estimate.mjs for context token estimation"
```

---

### Task 3: Add CLI tests for token-estimate — failing test

**Files:**
- Modify: `tests/tools/cli.test.mjs`

**Step 1: Write the failing test**

Add a new describe block at the end of the file (before the final closing, after the `--context-file flag` describe block):

```js
describe('CLI: token-estimate.mjs', () => {
  it('outputs valid JSON with expected structure', async () => {
    const { stdout } = await exec(NODE, [
      `${TOOLS}/token-estimate.mjs`,
      '--root', 'tests/fixtures/clean-project'
    ]);
    const result = JSON.parse(stdout);
    assert.equal(typeof result.total_chars, 'number');
    assert.equal(typeof result.estimated_tokens, 'number');
    assert.ok(Array.isArray(result.files));
    assert.ok(result.files.length > 0);
  });

  it('respects --context-file flag', async () => {
    const { stdout } = await exec(NODE, [
      `${TOOLS}/token-estimate.mjs`,
      '--root', 'tests/fixtures/clean-project',
      '--context-file', 'CLAUDE.md'
    ]);
    const result = JSON.parse(stdout);
    assert.ok(result.total_chars > 0);
  });

  it('returns zeros for missing context file', async () => {
    const { stdout } = await exec(NODE, [
      `${TOOLS}/token-estimate.mjs`,
      '--root', 'tests/fixtures'
    ]);
    const result = JSON.parse(stdout);
    assert.equal(result.total_chars, 0);
    assert.equal(result.estimated_tokens, 0);
  });
});
```

**Step 2: Run to verify tests pass** (since implementation already exists from Task 2)

Run: `eval "$(fnm env)" && node --test tests/tools/cli.test.mjs`
Expected: ALL PASS (including new token-estimate tests)

**Step 3: Commit**

```bash
git add tests/tools/cli.test.mjs
git commit -m "test: add CLI tests for token-estimate.mjs"
```

---

### Task 4: Enhance audit-mode.md — Token Impact section

**Files:**
- Modify: `skills/context-architect/audit-mode.md`

**Step 1: Add token-estimate to the Process Summary**

In the Process Summary section (around line 360), change line 367-368:

```
7. Calculate CCS                    → ccs-score.mjs
8. Generate report (6-item format)
```

to:

```
7. Calculate CCS                    → ccs-score.mjs
8. Estimate tokens                  → token-estimate.mjs
9. Generate report (6-item format)
10. Present auto-fix proposals
11. Apply fixes only after user approval
```

(Remove the old lines 9-10 since they're now 10-11.)

**Step 2: Rewrite the "6. Reasoning Cost Impact" section**

Replace the current section "### 6. Reasoning Cost Impact" (around lines 283-291) with:

````markdown
### 6. Token Impact

Run the token estimator:

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/token-estimate.mjs --root .
```

Use the output to calculate before/after numbers. Present in this format:

```
Token Impact:
  Current index injection: ~{index_tokens} tokens ({context_file})
  Current total context: ~{total_tokens} tokens (index + {linked_count} linked docs)

  Removable (REDUNDANT): ~{redundant_tokens} tokens ({redundant_count} statements)
  Separable (index → linked): ~{separable_tokens} tokens (content leak items)

  Estimated savings: ~{savings} tokens/conversation ({percentage}% reduction)
```

**Calculation rules:**
- `index_tokens` = tokens from files with `role: "index"` in token-estimate output
- `total_tokens` = `estimated_tokens` from token-estimate output
- `redundant_tokens` = sum of `Math.ceil(statement.length / 4)` for each REDUNDANT statement from Phase 4
- `separable_tokens` = estimate of content identified as `index_content_leak` in Phase 1
- `savings` = `redundant_tokens + separable_tokens`
- `percentage` = `Math.round(savings / index_tokens * 100)`

Numbers MUST be concrete (e.g., "~200 tokens"), not vague (e.g., "some savings").
````

**Step 3: Verify markdown structure**

Read the file back and confirm headings, code blocks, and tables render correctly.

**Step 4: Commit**

```bash
git add skills/context-architect/audit-mode.md
git commit -m "docs: add Token Impact section with token-estimate.mjs integration"
```

---

### Task 5: Enhance audit-mode.md — Structure Proposals section

**Files:**
- Modify: `skills/context-architect/audit-mode.md`

**Step 1: Rewrite the "4. Recommended Structure" section**

Replace the current section "### 4. Recommended Structure" (around lines 271-278) with:

````markdown
### 4. Structure Proposals

Map Phase 1-3 findings to concrete restructuring actions. Read actual file headings to determine split points.

**Finding-to-proposal mapping:**

| Finding | Proposal |
|---------|----------|
| monolith (300+ lines) | Split into N docs by top-level headings. Index keeps links only. |
| index_content_leak | Move code blocks and long paragraphs to `docs/`, replace with links. |
| role_mixing | Separate into role-specific docs (e.g., `conventions.md`, `testing.md`, `deploy.md`). |
| fat_doc (200+ lines) | Split by `##` headings into smaller focused docs. |
| orphan_doc | Add link to index, or recommend deletion if outdated. |
| broken_link | Suggest correct target path, or remove if target no longer exists. |

**Output format:**

```
Structure Proposals:
  1. CLAUDE.md (342 lines) → split into 3
     - CLAUDE.md (index, ~30 lines) — links only
     - docs/conventions.md — style/naming sections (lines 45-120)
     - docs/testing.md — test sections (lines 121-200)
     Savings: ~250 tokens removed from index injection

  2. docs/ARCHITECTURE.md (267 lines) → split into 2
     - docs/architecture.md — design overview
     - docs/api-reference.md — API details

  3. docs/old-notes.md — orphan, not linked from CLAUDE.md
     → Add link to index or delete?
```

Each proposal MUST include the source line ranges where content will be moved from.
When a monolith or fat_doc is proposed for splitting, read the file's headings to determine natural split points.
````

**Step 2: Verify markdown structure**

Read the file back and confirm the section renders correctly.

**Step 3: Commit**

```bash
git add skills/context-architect/audit-mode.md
git commit -m "docs: rewrite Structure Proposals section with finding-to-proposal mapping"
```

---

### Task 6: Enhance audit-mode.md — Deletion Diffs section

**Files:**
- Modify: `skills/context-architect/audit-mode.md`

**Step 1: Rewrite the "5. Fix Proposals" and "Auto-Fix Proposals" sections**

Replace the current "### 5. Fix Proposals" section (around line 279-281) with:

````markdown
### 5. Fix Proposals — Deletion Diffs

For Phase 4 REDUNDANT items, present line-level removal diffs with approval controls.

**REDUNDANT items:**

```
Deletion Proposals (REDUNDANT, {count} items):

1. {file}:{line}
   - {statement text}
   Reason: {reason from sub-agent}

2. {file}:{line}
   - {statement text}
   Reason: {reason from sub-agent}

Apply: 1,2,3 / all / none
```

**REVIEW items:**

```
Needs Review (REVIEW, {count} items):

{N}. {file}:{line}
   "{statement text}"
   AI assessment: {reason from sub-agent}
   → keep / remove?
```

**User controls:**
- Individual: `1,3` — apply only selected items
- Bulk: `all` — apply all REDUNDANT deletions at once
- Skip: `none` — apply nothing
- Each REVIEW item is decided individually (keep / remove)

**Applying deletions:**
- For each approved deletion, remove the exact line from the file using Edit tool
- After all deletions, re-run `token-estimate.mjs` to show actual savings
- Present before/after token comparison
````

**Step 2: Remove the old "Auto-Fix Proposals" section**

Delete everything from `## Auto-Fix Proposals` (around line 295) through the end of the "Broken Links" diff example (around line 354), since the fix proposals are now integrated into section 5 and the structure proposals in section 4.

**Step 3: Verify markdown structure**

Read the file back and confirm the overall document structure is intact:
- Phases 1-4 → CCS → Report (6 sections) → Process Summary → Reminders

**Step 4: Commit**

```bash
git add skills/context-architect/audit-mode.md
git commit -m "docs: rewrite Fix Proposals as Deletion Diffs with approval controls"
```

---

### Task 7: Update README.md

**Files:**
- Modify: `README.md`

**Step 1: Add token-estimate to the Tools section**

In the code block under "## Tools" (around line 39-43), add a new line after the knowledge-probe line:

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/token-estimate.mjs --root .
```

So the code block becomes:

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/ccs-score.mjs --root .
node ${CLAUDE_PLUGIN_ROOT}/tools/detect-antipatterns.mjs --phase structure --root .
node ${CLAUDE_PLUGIN_ROOT}/tools/knowledge-probe.mjs --root . --extract [--batch]
node ${CLAUDE_PLUGIN_ROOT}/tools/token-estimate.mjs --root .
```

**Step 2: Add a brief description after the code block**

After the existing `--context-file` paragraph (line 45), add:

```
The token estimator (`token-estimate.mjs`) counts characters across all context files (index + linked docs) and estimates token injection cost using `chars / 4`. Output includes per-file breakdown with role classification (`index` vs `linked`).
```

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add token-estimate.mjs to README Tools section"
```

---

### Task 8: Run full test suite and verify

**Files:** None (verification only)

**Step 1: Run all tests**

Run: `eval "$(fnm env)" && node --test 'tests/**/*.test.mjs'`
Expected: ALL PASS (72 existing + 8 unit + 3 CLI = ~83 tests)

**Step 2: Verify CLI outputs**

```bash
# Token estimate for clean project
eval "$(fnm env)" && node tools/token-estimate.mjs --root tests/fixtures/clean-project

# Token estimate for over-specified project
eval "$(fnm env)" && node tools/token-estimate.mjs --root tests/fixtures/over-specified
```

Expected: JSON output with `total_chars`, `estimated_tokens`, `files` array. Each file has `chars`, `tokens`, `role`.

**Step 3: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "fix: address test/lint issues from actionable report implementation"
```

Only if Step 1 or 2 revealed issues. Otherwise skip.
