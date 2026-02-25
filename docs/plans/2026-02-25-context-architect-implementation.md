# Context Architect Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a standalone Claude Code plugin that enforces structural context management via role separation, minimal injection, hierarchical indexing, and knowledge diff.

**Architecture:** Hub-and-spoke skill (SKILL.md dispatcher + 3 mode files) backed by Node.js ESM CLI tools for automated analysis. Index-driven scope detection with optional manifest override.

**Tech Stack:** Claude Code plugin system, Node.js ESM (.mjs, zero dependencies), Markdown skill files

---

### Task 1: Plugin Scaffolding

**Files:**
- Create: `.claude-plugin/plugin.json`
- Create: `package.json`
- Create: `LICENSE`

**Step 1: Create plugin manifest**

```json
// .claude-plugin/plugin.json
{
  "name": "context-architect",
  "description": "Context structure architect and auditor: enforces role separation, minimal injection, and prevents over-specification",
  "version": "0.1.0",
  "author": {
    "name": "jklyoo"
  },
  "license": "MIT",
  "keywords": ["context", "CLAUDE.md", "audit", "minimal-injection", "role-separation"],
  "skills": "./skills/"
}
```

**Step 2: Create package.json**

```json
{
  "name": "context-architect",
  "version": "0.1.0",
  "type": "module",
  "description": "Claude Code plugin: context structure architect and auditor",
  "license": "MIT",
  "scripts": {
    "test": "node --test tests/",
    "test:tools": "node --test tests/tools/",
    "ccs": "node tools/ccs-score.mjs",
    "antipatterns": "node tools/detect-antipatterns.mjs",
    "probe": "node tools/knowledge-probe.mjs"
  }
}
```

**Step 3: Create LICENSE**

MIT license with current year and author.

**Step 4: Commit**

```bash
git add .claude-plugin/plugin.json package.json LICENSE
git commit -m "chore: scaffold plugin structure"
```

---

### Task 2: SKILL.md — Hub (Core Principles + Mode Dispatch)

**Files:**
- Create: `skills/context-architect/SKILL.md`

**Step 1: Write SKILL.md**

The hub file (~150 lines) must include:

1. **Frontmatter:**
```yaml
---
name: context-architect
description: Use when creating, auditing, or updating project context files (CLAUDE.md, docs/) — enforces role separation, minimal injection, and prevents over-specification that increases agent reasoning cost
---
```

2. **The Iron Law:**
```
NO CONTEXT WITHOUT STRUCTURAL JUSTIFICATION
```

3. **5 Core Principles** (2-3 lines each):
   - Role Separation
   - Minimal Injection
   - Static vs Dynamic
   - Index, Not Content
   - Knowledge Diff

4. **Mode Dispatch Flowchart** (Graphviz dot):
   - No context files exist? → CREATE (read create-mode.md)
   - Existing context files? → AUDIT (read audit-mode.md)
   - Project changed? → UPDATE (read update-mode.md)

5. **Two-Layer System** explanation (3 lines):
   - Layer 1: Context files (CLAUDE.md = index/map)
   - Layer 2: Reference docs (on-demand, discovered via links)

6. **Scope Detection** (3 lines):
   - Default: follow links from CLAUDE.md
   - Optional: `.context-architect.json` for overrides

7. **Rationalization Prevention Table** (6 rows from design doc)

8. **Niche Repo Exception** rule (5 conditions, 2+ required)

9. **Output format** reminder (6-item structure)

10. **User language rule**: "All user-facing reports MUST be in the user's language."

**Key constraints:**
- MUST stay under 150 lines
- NO implementation details (those go in mode files)
- NO tool usage details (those go in mode files)
- References mode files as: "Read `create-mode.md` in this skill directory"

**Step 2: Verify line count**

Run: `wc -l skills/context-architect/SKILL.md`
Expected: under 150 lines

**Step 3: Commit**

```bash
git add skills/context-architect/SKILL.md
git commit -m "feat: add SKILL.md hub with core principles and mode dispatch"
```

---

### Task 3: create-mode.md

**Files:**
- Create: `skills/context-architect/create-mode.md`

**Step 1: Write create-mode.md**

Structure:

1. **Purpose**: Design a two-layer context architecture for a new or undocumented project.

2. **Pre-flight Checks**:
   - Scan project root for existing context files (CLAUDE.md, .claude/, .cursorrules)
   - Read README.md, package.json, or equivalent for project info
   - Check Niche Repo Exception conditions

3. **Process** (numbered steps):

   Step 1: **Analyze Project**
   - Identify: language, framework, build system, test runner, deploy method
   - Identify: custom conventions vs. defaults (use Knowledge Diff principle)
   - Identify: what's already documented vs. missing

   Step 2: **Design Layer 1 (Index)**
   - Draft minimal CLAUDE.md as index/map
   - Each entry: one-line description + link to reference doc
   - Include ONLY: project-specific customs, non-obvious decisions, non-standard commands

   Step 3: **Design Layer 2 (Reference Docs)**
   - For each topic that needs depth: propose a reference doc location
   - Each doc must be: header-first, single-role, under 200 lines
   - Prefer colocating with relevant code (e.g., `src/auth/CONVENTIONS.md`)

   Step 4: **Apply 3 Tests to Every Item**
   - Public Knowledge Test: can AI find this in public docs?
   - Default vs Custom Test: is this standard or project-specific?
   - Discoverable Test: can AI learn this from reading the code?
   - If all 3 say "AI knows" → don't include

   Step 5: **Present to User**
   - Show proposed CLAUDE.md structure
   - Show proposed reference doc locations + header-first templates
   - Show what was excluded and why
   - Wait for user approval before creating files

4. **Output Template**:
   ```
   ## Proposed Context Architecture

   ### Layer 1: CLAUDE.md (index)
   [proposed content]

   ### Layer 2: Reference Docs
   [path → purpose → template]

   ### Excluded (AI already knows)
   [items removed with reason]

   ### CCS Estimate: [score] ([rating])
   ```

**Step 2: Commit**

```bash
git add skills/context-architect/create-mode.md
git commit -m "feat: add CREATE mode — context architecture design process"
```

---

### Task 4: audit-mode.md

**Files:**
- Create: `skills/context-architect/audit-mode.md`

**Step 1: Write audit-mode.md**

This is the most complex mode. Structure:

1. **Purpose**: Audit existing context files for over-specification, structural issues, and redundancy.

2. **Scope Discovery**:
   - Parse CLAUDE.md for all file links → build scope
   - Check for `.context-architect.json` → merge additional scope
   - List all discovered files for user confirmation

3. **Phase 1: Structural Analysis** (run `detect-antipatterns.mjs`):
   ```bash
   node ${PLUGIN_ROOT}/tools/detect-antipatterns.mjs --phase structure --root .
   ```
   Checks: monolith, role soup, tool forcing, directory dump, lint dump, README echo, philosophy essay

4. **Phase 2: Docs Analysis** (run `detect-antipatterns.mjs`):
   ```bash
   node ${PLUGIN_ROOT}/tools/detect-antipatterns.mjs --phase docs --root .
   ```
   Checks: header-less doc, fat doc (200+ lines), orphan doc

5. **Phase 3: Link Integrity** (run `detect-antipatterns.mjs`):
   ```bash
   node ${PLUGIN_ROOT}/tools/detect-antipatterns.mjs --phase links --root .
   ```
   Checks: broken links, index-content leak, orphan docs not linked from index

6. **Phase 4: Knowledge Diff** (run `knowledge-probe.mjs` + sub-agent):
   ```bash
   node ${PLUGIN_ROOT}/tools/knowledge-probe.mjs --root . --extract
   ```
   This outputs extracted statements as JSON. Then:
   - Spawn a sub-agent (model from `.context-architect.json` → `probe_model`, default: `sonnet`) with NO project context
   - Feed extracted questions to sub-agent
   - Compare responses → classify REDUNDANT / UNIQUE / REVIEW
   - Present REVIEW items to user in their language

7. **CCS Calculation** (run `ccs-score.mjs`):
   ```bash
   node ${PLUGIN_ROOT}/tools/ccs-score.mjs --root .
   ```

8. **Report Generation**:
   Present results in the 6-item output format (from SKILL.md).
   All user-facing text in user's language.

9. **Auto-Fix Proposals**:
   For each finding, propose concrete fix:
   - REDUNDANT items → show removal diff
   - Structural issues → show restructuring diff
   - Missing links → show additions
   - User approves each fix before applying

**Step 2: Commit**

```bash
git add skills/context-architect/audit-mode.md
git commit -m "feat: add AUDIT mode — 4-phase analysis with knowledge diff"
```

---

### Task 5: update-mode.md

**Files:**
- Create: `skills/context-architect/update-mode.md`

**Step 1: Write update-mode.md**

Structure:

1. **Purpose**: Update context architecture after project changes while maintaining structural integrity.

2. **Trigger Analysis**:
   - What changed? (new feature, refactor, dependency change, team convention change)
   - Which layer is affected? (Layer 1 index, Layer 2 docs, both)

3. **Process**:

   Step 1: **Classify the Change**
   - Static change (permanent decision) → update context files
   - Dynamic change (session/temporary) → MEMORY.md or skip
   - If unclear → ask user

   Step 2: **Apply 3 Tests**
   - Same Public Knowledge / Default vs Custom / Discoverable tests from CREATE mode
   - If all 3 say "AI knows" → don't add to context

   Step 3: **Determine Action**
   - Add new item → to which layer? Index or reference doc?
   - Modify existing → restructure if role is now mixed
   - Remove item → check for broken links after removal

   Step 4: **Link Integrity Check**
   ```bash
   node ${PLUGIN_ROOT}/tools/detect-antipatterns.mjs --phase links --root .
   ```

   Step 5: **Quick CCS Check**
   ```bash
   node ${PLUGIN_ROOT}/tools/ccs-score.mjs --root .
   ```
   If score increased → warn user with before/after comparison

   Step 6: **Present Changes**
   - Show proposed modifications as diffs
   - Show CCS impact (before → after)
   - User approves before applying

4. **Anti-Append Rule**:
   "Before adding content, ask: should I restructure instead of append? If a file is approaching 200 lines or mixing roles, restructure first."

**Step 2: Commit**

```bash
git add skills/context-architect/update-mode.md
git commit -m "feat: add UPDATE mode — change classification and sync process"
```

---

### Task 6: Test Fixtures

**Files:**
- Create: `tests/fixtures/clean-project/CLAUDE.md`
- Create: `tests/fixtures/clean-project/docs/conventions.md`
- Create: `tests/fixtures/over-specified/CLAUDE.md`
- Create: `tests/fixtures/over-specified/docs/orphan.md`
- Create: `tests/fixtures/broken-links/CLAUDE.md`

**Step 1: Create clean-project fixture (CCS 0, no issues)**

`tests/fixtures/clean-project/CLAUDE.md`:
```markdown
# Project

## Conventions
See [conventions](docs/conventions.md) for project-specific patterns.

## Build
Custom build: `./scripts/build.sh --target prod`
```

`tests/fixtures/clean-project/docs/conventions.md`:
```markdown
# Conventions
API errors use AppError class from src/lib/errors.ts.
```

**Step 2: Create over-specified fixture (CCS 10+, many issues)**

`tests/fixtures/over-specified/CLAUDE.md`: A 350+ line file containing:
- Embedded style guide (role mixing)
- "Always use ESLint" (tool forcing)
- Full directory tree (directory dump)
- "Use async/await" (redundant knowledge)
- Actual architecture content (index-content leak)
- Link to `docs/architecture.md` (exists)
- No link to `docs/orphan.md` (orphan)

`tests/fixtures/over-specified/docs/architecture.md`:
```markdown
Architecture details here...
```

`tests/fixtures/over-specified/docs/orphan.md`:
```markdown
This doc exists but is not linked from CLAUDE.md.
```

**Step 3: Create broken-links fixture**

`tests/fixtures/broken-links/CLAUDE.md`:
```markdown
# Project
See [api docs](docs/api.md) for API reference.
See [deploy guide](docs/deploy.md) for deployment.
```

(Neither `docs/api.md` nor `docs/deploy.md` exist.)

**Step 4: Commit**

```bash
git add tests/fixtures/
git commit -m "test: add fixtures for clean, over-specified, and broken-links scenarios"
```

---

### Task 7: ccs-score.mjs — Test + Implement

**Files:**
- Create: `tests/tools/ccs-score.test.mjs`
- Create: `tools/ccs-score.mjs`

**Step 1: Write failing test**

```javascript
// tests/tools/ccs-score.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateCCS } from '../../tools/ccs-score.mjs';

describe('calculateCCS', () => {
  it('returns 0 for clean project', async () => {
    const result = await calculateCCS('tests/fixtures/clean-project');
    assert.equal(result.total, 0);
    assert.equal(result.rating, 'Safe');
  });

  it('detects monolith (300+ lines)', async () => {
    const result = await calculateCCS('tests/fixtures/over-specified');
    const monolith = result.factors.find(f => f.name === 'monolith');
    assert.ok(monolith);
    assert.equal(monolith.score, 3);
  });

  it('detects fat doc (200+ lines)', async () => {
    const result = await calculateCCS('tests/fixtures/over-specified');
    const fatDoc = result.factors.find(f => f.name === 'fat_doc');
    // only flagged if a doc is 200+ lines
    if (fatDoc) assert.equal(fatDoc.score, 2);
  });

  it('calculates correct rating thresholds', async () => {
    const result = await calculateCCS('tests/fixtures/over-specified');
    assert.ok(result.total >= 6);
    assert.equal(result.rating, 'High Over-Specification');
  });

  it('returns structured output with factors array', async () => {
    const result = await calculateCCS('tests/fixtures/clean-project');
    assert.ok(Array.isArray(result.factors));
    assert.ok(typeof result.total === 'number');
    assert.ok(['Safe', 'Risk', 'High Over-Specification'].includes(result.rating));
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/tools/ccs-score.test.mjs`
Expected: FAIL — module not found

**Step 3: Implement ccs-score.mjs**

```javascript
// tools/ccs-score.mjs
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const CONTEXT_FILES = ['CLAUDE.md', '.claude'];
const THRESHOLDS = { safe: 2, risk: 5 };

export async function calculateCCS(rootPath) {
  const root = resolve(rootPath);
  const factors = [];

  // Gather all context files and docs linked from CLAUDE.md
  const claudeMd = await safeRead(join(root, 'CLAUDE.md'));
  const linkedDocs = claudeMd ? extractLinks(claudeMd) : [];
  const allFiles = [
    { path: join(root, 'CLAUDE.md'), content: claudeMd, type: 'context' },
  ];

  for (const link of linkedDocs) {
    const fullPath = join(root, link);
    const content = await safeRead(fullPath);
    if (content !== null) {
      allFiles.push({ path: fullPath, content, type: 'doc' });
    }
  }

  // Also scan for docs not linked (for orphan detection later)
  const docsDir = join(root, 'docs');
  const docFiles = await listFiles(docsDir);
  for (const f of docFiles) {
    if (!allFiles.some(a => a.path === f)) {
      const content = await safeRead(f);
      if (content !== null) {
        allFiles.push({ path: f, content, type: 'orphan_doc' });
      }
    }
  }

  // Factor: Monolith (single context file 300+ lines)
  for (const f of allFiles.filter(f => f.type === 'context')) {
    if (f.content && f.content.split('\n').length >= 300) {
      factors.push({ name: 'monolith', score: 3, file: f.path });
    }
  }

  // Factor: Role mixing (detect multiple role keywords in one file)
  for (const f of allFiles.filter(f => f.type === 'context')) {
    if (f.content && detectRoleMixing(f.content)) {
      factors.push({ name: 'role_mixing', score: 2, file: f.path });
    }
  }

  // Factor: Tool forcing
  for (const f of allFiles.filter(f => f.type === 'context')) {
    if (f.content && detectToolForcing(f.content)) {
      factors.push({ name: 'tool_forcing', score: 2, file: f.path });
    }
  }

  // Factor: Duplicate info (context file has content that should be in docs)
  if (claudeMd && detectIndexContentLeak(claudeMd)) {
    factors.push({ name: 'index_content_leak', score: 2, file: join(root, 'CLAUDE.md') });
  }

  // Factor: No docs separation (context has substance but no links to docs)
  if (claudeMd && linkedDocs.length === 0 && claudeMd.split('\n').length > 30) {
    factors.push({ name: 'no_docs_separation', score: 1, file: join(root, 'CLAUDE.md') });
  }

  // Factor: Orphan doc
  for (const f of allFiles.filter(f => f.type === 'orphan_doc')) {
    factors.push({ name: 'orphan_doc', score: 1, file: f.path });
  }

  // Factor: Broken links
  for (const link of linkedDocs) {
    const fullPath = join(root, link);
    if (!(await fileExists(fullPath))) {
      factors.push({ name: 'broken_link', score: 2, file: fullPath });
    }
  }

  // Factor: Header-less doc
  for (const f of allFiles.filter(f => f.type === 'doc' || f.type === 'orphan_doc')) {
    if (f.content && !f.content.trimStart().startsWith('#')) {
      factors.push({ name: 'headerless_doc', score: 1, file: f.path });
    }
  }

  // Factor: Fat doc (200+ lines)
  for (const f of allFiles.filter(f => f.type === 'doc' || f.type === 'orphan_doc')) {
    if (f.content && f.content.split('\n').length >= 200) {
      factors.push({ name: 'fat_doc', score: 2, file: f.path });
    }
  }

  const total = factors.reduce((sum, f) => sum + f.score, 0);
  const rating = total <= THRESHOLDS.safe ? 'Safe'
    : total <= THRESHOLDS.risk ? 'Risk'
    : 'High Over-Specification';

  return { factors, total, rating };
}

// --- Helpers ---

function extractLinks(markdown) {
  const linkRegex = /\[.*?\]\(((?!https?:\/\/).*?)\)/g;
  const links = [];
  let match;
  while ((match = linkRegex.exec(markdown)) !== null) {
    links.push(match[1]);
  }
  return links;
}

function detectRoleMixing(content) {
  const roles = [
    /#{1,3}\s*(style|convention|naming)/i,
    /#{1,3}\s*(tool|command|script|build|test|deploy)/i,
    /#{1,3}\s*(rule|behavior|policy|workflow)/i,
    /#{1,3}\s*(architecture|structure|design)/i,
  ];
  const matched = roles.filter(r => r.test(content));
  return matched.length >= 3;
}

function detectToolForcing(content) {
  return /always\s+use\s+\w+/i.test(content) || /must\s+use\s+\w+/i.test(content);
}

function detectIndexContentLeak(content) {
  // If CLAUDE.md has code blocks or long paragraphs, it's leaking content
  const codeBlocks = (content.match(/```[\s\S]*?```/g) || []).length;
  const longParas = content.split('\n\n').filter(p => p.length > 300).length;
  return codeBlocks >= 3 || longParas >= 2;
}

async function safeRead(filePath) {
  try { return await readFile(filePath, 'utf-8'); }
  catch { return null; }
}

async function fileExists(filePath) {
  try { await stat(filePath); return true; }
  catch { return false; }
}

async function listFiles(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true, recursive: true });
    return entries
      .filter(e => e.isFile() && e.name.endsWith('.md'))
      .map(e => join(e.parentPath || dir, e.name));
  } catch { return []; }
}

// CLI entry
if (import.meta.url === `file://${process.argv[1]}`) {
  const root = process.argv[2] || '.';
  const result = await calculateCCS(root);
  console.log(JSON.stringify(result, null, 2));
}
```

**Step 4: Run tests to verify they pass**

Run: `node --test tests/tools/ccs-score.test.mjs`
Expected: all PASS

**Step 5: Commit**

```bash
git add tools/ccs-score.mjs tests/tools/ccs-score.test.mjs
git commit -m "feat: add ccs-score.mjs with tests — Context Complexity Score calculator"
```

---

### Task 8: detect-antipatterns.mjs — Test + Implement

**Files:**
- Create: `tests/tools/detect-antipatterns.test.mjs`
- Create: `tools/detect-antipatterns.mjs`

**Step 1: Write failing test**

```javascript
// tests/tools/detect-antipatterns.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectAntipatterns } from '../../tools/detect-antipatterns.mjs';

describe('detectAntipatterns — phase: structure', () => {
  it('finds no issues in clean project', async () => {
    const result = await detectAntipatterns('tests/fixtures/clean-project', 'structure');
    assert.equal(result.findings.length, 0);
  });

  it('detects monolith in over-specified project', async () => {
    const result = await detectAntipatterns('tests/fixtures/over-specified', 'structure');
    const monolith = result.findings.find(f => f.type === 'monolith');
    assert.ok(monolith);
  });

  it('detects tool forcing', async () => {
    const result = await detectAntipatterns('tests/fixtures/over-specified', 'structure');
    const toolForcing = result.findings.find(f => f.type === 'tool_forcing');
    assert.ok(toolForcing);
  });
});

describe('detectAntipatterns — phase: docs', () => {
  it('finds no doc issues in clean project', async () => {
    const result = await detectAntipatterns('tests/fixtures/clean-project', 'docs');
    assert.equal(result.findings.length, 0);
  });
});

describe('detectAntipatterns — phase: links', () => {
  it('detects broken links', async () => {
    const result = await detectAntipatterns('tests/fixtures/broken-links', 'links');
    const broken = result.findings.filter(f => f.type === 'broken_link');
    assert.equal(broken.length, 2);
  });

  it('detects orphan docs', async () => {
    const result = await detectAntipatterns('tests/fixtures/over-specified', 'links');
    const orphan = result.findings.find(f => f.type === 'orphan_doc');
    assert.ok(orphan);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/tools/detect-antipatterns.test.mjs`
Expected: FAIL — module not found

**Step 3: Implement detect-antipatterns.mjs**

The tool runs specific phase checks and returns structured findings. It reuses detection helpers from ccs-score.mjs (import shared logic or duplicate — prefer import).

Key structure:
```javascript
export async function detectAntipatterns(rootPath, phase) {
  // phase: 'structure' | 'docs' | 'links'
  const findings = [];
  // ... phase-specific checks ...
  return { phase, findings };
}
```

Each finding:
```javascript
{ type: 'monolith', severity: 'high', file: 'CLAUDE.md', line: null, message: '...' }
```

**Phase structure** checks: monolith, role_mixing, tool_forcing, directory_dump, lint_dump, readme_echo, philosophy_essay, index_content_leak

**Phase docs** checks: headerless_doc, fat_doc

**Phase links** checks: broken_link, orphan_doc

**Step 4: Run tests to verify they pass**

Run: `node --test tests/tools/detect-antipatterns.test.mjs`
Expected: all PASS

**Step 5: Commit**

```bash
git add tools/detect-antipatterns.mjs tests/tools/detect-antipatterns.test.mjs
git commit -m "feat: add detect-antipatterns.mjs with tests — 3-phase structural analysis"
```

---

### Task 9: knowledge-probe.mjs — Test + Implement

**Files:**
- Create: `tests/tools/knowledge-probe.test.mjs`
- Create: `tools/knowledge-probe.mjs`

**Step 1: Write failing test**

```javascript
// tests/tools/knowledge-probe.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractStatements, toProbeQuestions } from '../../tools/knowledge-probe.mjs';

describe('extractStatements', () => {
  it('extracts directive statements from markdown', () => {
    const content = `# Rules
Use PascalCase for components.
API errors must use AppError class.
Deploy with ./scripts/deploy.sh.

## Links
See [docs](docs/arch.md).`;

    const stmts = extractStatements(content);
    assert.ok(stmts.length >= 3);
    assert.ok(stmts.some(s => s.includes('PascalCase')));
    assert.ok(stmts.some(s => s.includes('AppError')));
    assert.ok(stmts.some(s => s.includes('deploy.sh')));
  });

  it('ignores headings, links, and empty lines', () => {
    const content = `# Title\n\nSee [link](file.md).\n\n`;
    const stmts = extractStatements(content);
    assert.equal(stmts.length, 0);
  });
});

describe('toProbeQuestions', () => {
  it('converts statements to neutral questions', () => {
    const stmts = ['Use PascalCase for all components.'];
    const questions = toProbeQuestions(stmts, { framework: 'React' });
    assert.equal(questions.length, 1);
    assert.ok(questions[0].question.includes('?'));
    assert.ok(questions[0].original === stmts[0]);
  });

  it('batches statements into groups of 5', () => {
    const stmts = Array.from({ length: 12 }, (_, i) => `Rule ${i + 1}.`);
    const questions = toProbeQuestions(stmts, {});
    // Should produce batched output
    assert.ok(questions.length === 12);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/tools/knowledge-probe.test.mjs`
Expected: FAIL — module not found

**Step 3: Implement knowledge-probe.mjs**

This tool has two responsibilities:
1. **Extract** directive statements from context files (filters out headings, links, blank lines)
2. **Convert** statements to neutral probe questions

It does NOT spawn the sub-agent — that's orchestrated by the agent following audit-mode.md.

```javascript
export function extractStatements(markdownContent) {
  // Split into lines, filter:
  // - Remove headings (# ...)
  // - Remove pure link lines (See [...](...))
  // - Remove empty lines
  // - Remove very short lines (< 10 chars)
  // - Keep directive sentences (statements with verbs/commands)
}

export function toProbeQuestions(statements, context = {}) {
  // For each statement:
  // - Strip project-specific nouns
  // - Convert imperative to interrogative
  // - Add framework context if provided
  // Return: [{ original, question, context }]
}
```

CLI mode outputs JSON for agent consumption:
```bash
node tools/knowledge-probe.mjs --root . --extract
# → JSON array of { original, question }
```

**Step 4: Run tests to verify they pass**

Run: `node --test tests/tools/knowledge-probe.test.mjs`
Expected: all PASS

**Step 5: Commit**

```bash
git add tools/knowledge-probe.mjs tests/tools/knowledge-probe.test.mjs
git commit -m "feat: add knowledge-probe.mjs with tests — statement extraction and question conversion"
```

---

### Task 10: Hooks + README + Final Integration

**Files:**
- Create: `hooks/hooks.json`
- Create: `README.md`

**Step 1: Create prepared hooks (disabled)**

```json
// hooks/hooks.json
{
  "hooks": {}
}
```

Empty hooks object — prepared for v2 but does nothing in v1.

**Step 2: Write README.md**

Concise README covering:
- What: Context structure architect and auditor plugin
- Install: how to add as Claude Code plugin
- Usage: 3 modes (CREATE, AUDIT, UPDATE)
- Tools: CLI tools for automated analysis
- Configuration: `.context-architect.json` optional manifest
- Philosophy: link to design doc

Keep under 80 lines.

**Step 3: Run all tests**

Run: `node --test tests/`
Expected: all PASS

**Step 4: Final commit**

```bash
git add hooks/ README.md
git commit -m "feat: complete v0.1.0 — hooks placeholder and README"
```

---

## Task Dependency Graph

```
Task 1 (scaffold) → Task 2 (SKILL.md) → Task 3 (create-mode)
                                       → Task 4 (audit-mode)
                                       → Task 5 (update-mode)
                  → Task 6 (fixtures)  → Task 7 (ccs-score)
                                       → Task 8 (antipatterns)
                                       → Task 9 (knowledge-probe)
                                       → Task 10 (hooks + README)
```

Tasks 2-5 (skill files) and Tasks 6-9 (tools) can be parallelized after Task 1.
Task 10 depends on all others.
