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

// ── CLI entry point ───────────────────────────────────────────────────────

const isMain = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

if (isMain) {
  const args = process.argv.slice(2);
  let rootPath = '.';
  let extract = false;
  let contextFile;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--root' && args[i + 1]) {
      rootPath = args[++i];
    } else if (args[i] === '--extract') {
      extract = true;
    } else if (args[i] === '--context-file' && args[i + 1]) {
      contextFile = args[++i];
    }
  }

  if (!extract) {
    console.error('Usage: node tools/knowledge-probe.mjs --root <path> --extract');
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

  console.log(JSON.stringify(statements, null, 2));
}
