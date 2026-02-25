import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Extract directive statements from markdown content.
 *
 * Filters out headings, code blocks, empty lines, very short lines,
 * and lines that are just markdown links.
 *
 * @param {string} markdownContent — raw markdown text
 * @returns {string[]} — array of directive statement strings (trimmed)
 */
export function extractStatements(markdownContent) {
  const lines = markdownContent.split('\n');
  const statements = [];
  let inCodeBlock = false;

  // Pattern for lines that are only a markdown link, e.g. "See [text](url)."
  const linkOnlyRe = /^\s*(?:[-*]?\s*)?(?:See\s+)?\[.*?\]\(.*?\)\.?\s*$/;

  for (const line of lines) {
    const trimmed = line.trim();

    // Track code block boundaries
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    // Skip content inside code blocks
    if (inCodeBlock) continue;

    // Skip empty lines
    if (trimmed === '') continue;

    // Skip headings
    if (trimmed.startsWith('#')) continue;

    // Skip very short lines (< 10 chars)
    if (trimmed.length < 10) continue;

    // Skip lines that are only markdown links
    if (linkOnlyRe.test(trimmed)) continue;

    statements.push(trimmed);
  }

  return statements;
}

/**
 * Convert directive statements into neutral probe questions.
 *
 * Uses heuristic pattern matching to transform imperative statements
 * into interrogative questions suitable for asking a fresh AI agent.
 *
 * @param {string[]} statements — array of directive statement strings
 * @param {object}   context   — optional context (e.g. { framework: 'React' })
 * @returns {Array<{ original: string, question: string }>}
 */
export function toProbeQuestions(statements, context = {}) {
  const fw = context.framework || '';

  return statements.map(stmt => {
    const question = convertToQuestion(stmt, fw);
    return { original: stmt, question };
  });
}

/**
 * Convert a single imperative statement into a neutral probe question.
 *
 * Patterns handled (in priority order):
 *   "Use X for Y"       -> "What is the standard approach for Y?"
 *   "Always do X"       -> "Is X the standard practice?"
 *   "X must Y"          -> "Should X do Y by default?"
 *   fallback            -> "Is the following a standard convention or project-specific? [statement]"
 *
 * @param {string} stmt — a directive statement
 * @param {string} fw   — framework name (may be empty)
 * @returns {string}
 */
function convertToQuestion(stmt, fw) {
  const fwSuffix = fw ? ` in ${fw}` : '';

  // "Use X for Y"
  const useForMatch = stmt.match(/^Use\s+(.+?)\s+for\s+(.+?)\.?\s*$/i);
  if (useForMatch) {
    return `What is the standard approach for ${useForMatch[2]}${fwSuffix}?`;
  }

  // "Always X" — strip the "Always" and make it a question
  const alwaysMatch = stmt.match(/^Always\s+(.+?)\.?\s*$/i);
  if (alwaysMatch) {
    return `Is ${alwaysMatch[1]} the standard practice${fwSuffix}?`;
  }

  // "X must Y"
  const mustMatch = stmt.match(/^(.+?)\s+must\s+(.+?)\.?\s*$/i);
  if (mustMatch) {
    return `Should ${mustMatch[1]} ${mustMatch[2]} by default${fwSuffix}?`;
  }

  // Fallback: wrap statement as-is
  return `Is the following a standard convention or project-specific${fwSuffix}? ${stmt}`;
}

// ── CLI entry point ───────────────────────────────────────────────────────

const isMain = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

if (isMain) {
  const args = process.argv.slice(2);
  let rootPath = '.';
  let extract = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--root' && args[i + 1]) {
      rootPath = args[++i];
    } else if (args[i] === '--extract') {
      extract = true;
    }
  }

  if (!extract) {
    console.error('Usage: node tools/knowledge-probe.mjs --root <path> --extract');
    process.exit(2);
  }

  const root = path.resolve(rootPath);
  const claudePath = path.join(root, 'CLAUDE.md');

  let claudeContent;
  try {
    claudeContent = await fs.readFile(claudePath, 'utf8');
  } catch {
    console.error(`Could not read ${claudePath}`);
    process.exit(2);
  }

  const statements = extractStatements(claudeContent);

  // Detect framework from package.json if available
  let framework = '';
  const pkgPath = path.join(root, 'package.json');
  try {
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.react) framework = 'React';
    else if (deps.vue) framework = 'Vue';
    else if (deps.angular || deps['@angular/core']) framework = 'Angular';
    else if (deps.svelte) framework = 'Svelte';
    else if (deps.next) framework = 'Next.js';
    else if (deps.express) framework = 'Express';
  } catch {
    // No package.json or can't parse — that's fine
  }

  const context = framework ? { framework } : {};
  const results = toProbeQuestions(statements, context);

  console.log(JSON.stringify(results, null, 2));
}
