import fs from 'node:fs/promises';
import path from 'node:path';
import { loadConfig, resolveContextFile } from './lib/config.mjs';

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

// ── CLI entry point ───────────────────────────────────────────────────────

const isMain = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

if (isMain) {
  const args = process.argv.slice(2);
  let rootPath = '.';
  let extract = false;
  let batch = false;
  let contextFile;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--root' && args[i + 1]) {
      rootPath = args[++i];
    } else if (args[i] === '--extract') {
      extract = true;
    } else if (args[i] === '--batch') {
      batch = true;
    } else if (args[i] === '--context-file' && args[i + 1]) {
      contextFile = args[++i];
    }
  }

  if (!extract) {
    console.error('Usage: node tools/knowledge-probe.mjs --root <path> --extract [--batch]');
    process.exit(2);
  }

  const root = path.resolve(rootPath);
  const config = await loadConfig(root);
  const ctxPath = resolveContextFile(root, contextFile, config);

  let ctxContent;
  try {
    ctxContent = await fs.readFile(ctxPath, 'utf8');
  } catch {
    console.error(`Could not read ${ctxPath}`);
    process.exit(2);
  }

  const statements = extractStatements(ctxContent);

  if (batch) {
    const batches = buildProbeBatches(statements);
    console.log(JSON.stringify(batches, null, 2));
  } else {
    console.log(JSON.stringify(statements, null, 2));
  }
}
