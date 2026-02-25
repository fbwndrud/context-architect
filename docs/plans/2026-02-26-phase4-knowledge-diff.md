# Phase 4: Knowledge Diff Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the Knowledge Diff pipeline so Phase 4 works end-to-end during `/context-architect` AUDIT mode.

**Architecture:** CLI (`knowledge-probe.mjs`) gains a `buildProbeBatches` export and `--batch` flag that generates sub-agent prompts. The skill (`audit-mode.md`) orchestrates Task tool calls per batch, aggregates REDUNDANT/UNIQUE/REVIEW classifications, adds a `duplicate_info` CCS factor, and generates removal diffs for user approval.

**Tech Stack:** Node.js ESM, node:test, Claude Code Task tool (skill-level)

---

### Task 1: Add `buildProbeBatches` — failing tests

**Files:**
- Modify: `tests/tools/knowledge-probe.test.mjs`

**Step 1: Write the failing tests**

Add at the bottom of the file:

```js
import { extractStatements, buildProbeBatches } from '../../tools/knowledge-probe.mjs';

// (keep existing extractStatements tests above unchanged)

describe('buildProbeBatches', () => {
  it('splits statements into batches of default size 10', () => {
    const stmts = Array.from({ length: 12 }, (_, i) => `Statement number ${i + 1} about coding.`);
    const batches = buildProbeBatches(stmts);
    assert.equal(batches.length, 2);
    assert.equal(batches[0].statements.length, 10);
    assert.equal(batches[1].statements.length, 2);
  });

  it('returns empty array for empty input', () => {
    const batches = buildProbeBatches([]);
    assert.deepEqual(batches, []);
  });

  it('respects custom batchSize', () => {
    const stmts = Array.from({ length: 12 }, (_, i) => `Statement number ${i + 1} about coding.`);
    const batches = buildProbeBatches(stmts, 5);
    assert.equal(batches.length, 3);
    assert.equal(batches[0].statements.length, 5);
    assert.equal(batches[1].statements.length, 5);
    assert.equal(batches[2].statements.length, 2);
  });

  it('includes numbered statements in prompt', () => {
    const stmts = ['Use PascalCase for components.', 'Always run tests before commit.'];
    const batches = buildProbeBatches(stmts);
    assert.equal(batches.length, 1);
    assert.ok(batches[0].prompt.includes('1. Use PascalCase for components.'));
    assert.ok(batches[0].prompt.includes('2. Always run tests before commit.'));
  });

  it('has correct output structure', () => {
    const stmts = ['Use PascalCase for components.'];
    const batches = buildProbeBatches(stmts);
    assert.equal(batches.length, 1);
    assert.equal(batches[0].batch_id, 1);
    assert.ok(Array.isArray(batches[0].statements));
    assert.equal(typeof batches[0].prompt, 'string');
  });

  it('prompt contains classification instructions', () => {
    const stmts = ['Use PascalCase for components.'];
    const batches = buildProbeBatches(stmts);
    assert.ok(batches[0].prompt.includes('REDUNDANT'));
    assert.ok(batches[0].prompt.includes('UNIQUE'));
    assert.ok(batches[0].prompt.includes('REVIEW'));
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `eval "$(fnm env)" && node --test tests/tools/knowledge-probe.test.mjs`
Expected: FAIL — `buildProbeBatches` is not exported from knowledge-probe.mjs

**Step 3: Commit**

```bash
git add tests/tools/knowledge-probe.test.mjs
git commit -m "test: add failing tests for buildProbeBatches"
```

---

### Task 2: Implement `buildProbeBatches`

**Files:**
- Modify: `tools/knowledge-probe.mjs`

**Step 1: Add the prompt template constant and function after `extractStatements`**

Insert between the closing `}` of `extractStatements` (line 49) and the `// ── CLI entry point` comment (line 52):

```js
const PROBE_PROMPT_TEMPLATE = `You are a knowledge probe agent testing whether context file statements contain information an AI coding assistant would already know.

RULES:
- Use ONLY your training knowledge. Do NOT read any project files.
- Do NOT assume any project-specific details.
- For each statement:
  1. Convert it into a neutral question that does NOT reveal the answer
  2. Answer that question from your general knowledge
  3. Compare your answer to the original statement
  4. Classify: REDUNDANT | UNIQUE | REVIEW

CLASSIFICATION:
- REDUNDANT: Your answer matches the statement (AI already knows this)
- UNIQUE: Your answer differs or you cannot answer (project-specific knowledge)
- REVIEW: Partial match (needs human decision)

Statements:
{numbered_statements}

Respond ONLY with a JSON array:
[
  {
    "statement": "original text",
    "question": "neutral question you generated",
    "answer": "your knowledge-based answer",
    "classification": "REDUNDANT | UNIQUE | REVIEW",
    "reason": "brief explanation"
  }
]`;

/**
 * Build batched probe prompts for sub-agent knowledge diff.
 *
 * @param {string[]} statements — extracted directive statements
 * @param {number} [batchSize=10] — max statements per batch
 * @returns {Array<{ batch_id: number, statements: string[], prompt: string }>}
 */
export function buildProbeBatches(statements, batchSize = 10) {
  if (statements.length === 0) return [];

  const batches = [];
  for (let i = 0; i < statements.length; i += batchSize) {
    const chunk = statements.slice(i, i + batchSize);
    const numbered = chunk.map((s, idx) => `${i + idx + 1}. ${s}`).join('\n');
    batches.push({
      batch_id: batches.length + 1,
      statements: chunk,
      prompt: PROBE_PROMPT_TEMPLATE.replace('{numbered_statements}', numbered),
    });
  }
  return batches;
}
```

**Step 2: Run tests to verify they pass**

Run: `eval "$(fnm env)" && node --test tests/tools/knowledge-probe.test.mjs`
Expected: ALL PASS (existing extractStatements tests + new buildProbeBatches tests)

**Step 3: Commit**

```bash
git add tools/knowledge-probe.mjs
git commit -m "feat: add buildProbeBatches for Phase 4 knowledge diff"
```

---

### Task 3: Add `--batch` CLI flag — failing test

**Files:**
- Modify: `tests/tools/cli.test.mjs`

**Step 1: Write the failing test**

Add inside the `describe('CLI: knowledge-probe.mjs')` block, after the existing tests:

```js
  it('outputs batched prompts with --extract --batch', async () => {
    const { stdout } = await exec(NODE, [
      `${TOOLS}/knowledge-probe.mjs`,
      '--root', 'tests/fixtures/over-specified',
      '--extract', '--batch'
    ]);
    const result = JSON.parse(stdout);
    assert.ok(Array.isArray(result));
    assert.ok(result.length > 0);
    assert.equal(typeof result[0].batch_id, 'number');
    assert.ok(Array.isArray(result[0].statements));
    assert.equal(typeof result[0].prompt, 'string');
    assert.ok(result[0].prompt.includes('REDUNDANT'));
  });
```

Also add a backward-compat check inside `describe('CLI: knowledge-probe.mjs')`:

```js
  it('--extract without --batch still outputs string array', async () => {
    const { stdout } = await exec(NODE, [
      `${TOOLS}/knowledge-probe.mjs`,
      '--root', 'tests/fixtures/over-specified',
      '--extract'
    ]);
    const result = JSON.parse(stdout);
    assert.ok(Array.isArray(result));
    assert.ok(result.length > 0);
    assert.equal(typeof result[0], 'string');
  });
```

**Step 2: Run tests to verify they fail**

Run: `eval "$(fnm env)" && node --test tests/tools/cli.test.mjs`
Expected: The `--batch` test FAILS (flag not parsed yet). The backward-compat test should PASS already.

**Step 3: Commit**

```bash
git add tests/tools/cli.test.mjs
git commit -m "test: add failing CLI test for --batch flag"
```

---

### Task 4: Implement `--batch` CLI flag

**Files:**
- Modify: `tools/knowledge-probe.mjs` (CLI section only)

**Step 1: Add `--batch` parsing and output**

In the CLI section, add `let batch = false;` alongside the other flags. Add the flag check in the parsing loop:

```js
    } else if (args[i] === '--batch') {
      batch = true;
    }
```

Replace the final output block (`const statements = ... console.log(...)`) with:

```js
  const statements = extractStatements(ctxContent);

  if (batch) {
    const batches = buildProbeBatches(statements);
    console.log(JSON.stringify(batches, null, 2));
  } else {
    console.log(JSON.stringify(statements, null, 2));
  }
```

**Step 2: Run all tests**

Run: `eval "$(fnm env)" && node --test 'tests/**/*.test.mjs'`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add tools/knowledge-probe.mjs
git commit -m "feat: add --batch CLI flag for batched probe prompts"
```

---

### Task 5: Update audit-mode.md Phase 4

**Files:**
- Modify: `skills/context-architect/audit-mode.md` (lines 111-183)

**Step 1: Replace the Phase 4 section**

Replace everything from `## Phase 4: Knowledge Diff` through the examples table (ending before the `---` on line 183) with:

````markdown
## Phase 4: Knowledge Diff

The most important phase. Tests whether context tells the AI things it already knows.

### Step 1: Extract Batched Prompts

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/knowledge-probe.mjs --root . --extract --batch
```

Output: JSON array of batch objects, each containing a `prompt` field ready for a sub-agent.

```json
[
  {
    "batch_id": 1,
    "statements": ["All components use PascalCase", "Tests use vitest", ...],
    "prompt": "You are a knowledge probe agent..."
  }
]
```

### Step 2: Probe Sub-Agents

For each batch, spawn a sub-agent using the Task tool:

- **subagent_type:** `general-purpose`
- **model:** from `.context-architect.json` → `probe_model` (default: `sonnet`)
- **prompt:** `batch.prompt` (use the prompt exactly as generated by the CLI)
- **Isolation:** The sub-agent must NOT read any project files. The prompt enforces this.

The sub-agent responds with a JSON array of classifications:

```json
[
  {
    "statement": "All components use PascalCase",
    "question": "In React, what is the standard component naming convention?",
    "answer": "PascalCase",
    "classification": "REDUNDANT",
    "reason": "Standard React convention"
  }
]
```

### Step 3: Aggregate Results

Merge all batch results into a single list. Group by classification:

| Classification | Meaning | Action |
|---|---|---|
| **REDUNDANT** | AI already knows this | Recommend removal |
| **UNIQUE** | Project-specific knowledge | Keep |
| **REVIEW** | Partial match | Present to user for decision (in user's language) |

### Step 4: CCS Integration

Add a `duplicate_info` factor to the CCS report based on REDUNDANT count:

| REDUNDANT count | CCS Score |
|-----------------|-----------|
| 1-3             | +1        |
| 4-7             | +2        |
| 8+              | +3        |

This factor is added at the skill level — the CCS CLI output is augmented in the report, not modified in ccs-score.mjs.

### Step 5: User Report + Removal Diffs

Present Phase 4 results in the report:

```
Phase 4 — Knowledge Diff:
  [REDUNDANT] "All components use PascalCase" → AI standard (remove)
  [REDUNDANT] "Tests use vitest" → inferable from config (remove)
  [REVIEW] "API errors use AppError class" → partial match (user decides)
  [UNIQUE] "Deploy with ./scripts/deploy.sh staging" → keep
```

For each REDUNDANT item, generate a removal diff:

```diff
- All components use PascalCase
```

Present diffs to the user. Apply only after explicit approval per item.
````

**Step 2: Verify no syntax issues**

Read the file back and confirm markdown renders correctly.

**Step 3: Commit**

```bash
git add skills/context-architect/audit-mode.md
git commit -m "docs: rewrite Phase 4 in audit-mode.md for CLI batch + sub-agent flow"
```

---

### Task 6: Update README.md

**Files:**
- Modify: `README.md`

**Step 1: Update the Tools section**

Replace the knowledge-probe command example line:

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/knowledge-probe.mjs --root . --extract
```

with:

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/knowledge-probe.mjs --root . --extract [--batch]
```

Replace the Phase 4 paragraph:

```
Phase 4 (Knowledge Diff) classification requires the `/context-architect` skill. The CLI extracts raw statements; a Claude sub-agent then handles question generation, probing, and classification in a single pass.
```

with:

```
Phase 4 (Knowledge Diff) runs during `/context-architect` AUDIT mode. The CLI extracts statements and generates batched probe prompts (`--extract --batch`). The skill then spawns isolated sub-agents via Task tool to classify each statement as REDUNDANT, UNIQUE, or REVIEW. REDUNDANT items get removal diffs for user approval. Phase 4 requires a Claude Code session — it cannot run standalone.
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README with Phase 4 batch workflow and limitations"
```

---

### Task 7: Run full test suite and verify

**Files:** None (verification only)

**Step 1: Run all tests**

Run: `eval "$(fnm env)" && node --test 'tests/**/*.test.mjs'`
Expected: ALL PASS (64 existing + 8 new = ~72 tests)

**Step 2: Verify CLI outputs**

```bash
# Existing behavior unchanged
eval "$(fnm env)" && node tools/knowledge-probe.mjs --root tests/fixtures/over-specified --extract | head -5

# New batch behavior
eval "$(fnm env)" && node tools/knowledge-probe.mjs --root tests/fixtures/over-specified --extract --batch | head -20
```

Expected: First outputs `string[]`, second outputs `Batch[]` with `batch_id`, `statements`, `prompt`.

**Step 3: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "fix: address test/lint issues from Phase 4 implementation"
```

Only if Step 1 or 2 revealed issues. Otherwise skip.
