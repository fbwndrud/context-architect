import fs from 'node:fs/promises';
import path from 'node:path';
import { loadConfig, resolveContextFile, fileExists, listMdFiles } from './lib/config.mjs';

/**
 * Context Complexity Score (CCS) calculator.
 *
 * Analyses a project root for over-specification antipatterns
 * in CLAUDE.md and related documentation files.
 *
 * @param {string} rootPath — path to project root (relative or absolute)
 * @param {object} [options]
 * @param {string} [options.contextFile] — override context file path
 * @returns {Promise<{factors: Array<{name: string, score: number, file: string}>, total: number, rating: string}>}
 */
export async function calculateCCS(rootPath, options = {}) {
  const root = path.resolve(rootPath);
  const config = await loadConfig(root);
  const factors = [];

  // ── Read context file ─────────────────────────────────────────────
  const claudePath = resolveContextFile(root, options.contextFile, config);
  let claudeContent;
  try {
    claudeContent = await fs.readFile(claudePath, 'utf8');
  } catch {
    // No CLAUDE.md at all — nothing to score
    return { factors: [], total: 0, rating: 'Safe' };
  }

  const claudeLines = claudeContent.split('\n');

  // ── Extract relative links from CLAUDE.md ───────────────────────────
  const linkRe = /\[.*?\]\(((?!https?:\/\/).*?)\)/g;
  const relativeLinks = [];
  let m;
  while ((m = linkRe.exec(claudeContent)) !== null) {
    relativeLinks.push(m[1]);
  }

  // ── 1. Monolith: any context file >= 300 lines ─────────────────────
  if (claudeLines.length >= 300) {
    factors.push({ name: 'monolith', score: 3, file: claudePath });
  }

  // ── 2. Role mixing: 3+ role-indicator headings in one file ─────────
  const rolePatterns = [
    /architect/i, /style/i, /testing/i, /test/i, /deploy/i,
    /tool/i, /api/i, /git/i, /ci/i, /workflow/i,
    /security/i, /infra/i, /devops/i, /convention/i,
  ];
  const headingRe = /^#{1,3}\s+(.+)/gm;
  const headings = [...claudeContent.matchAll(headingRe)].map(h => h[1]);
  const roleHeadings = headings.filter(h =>
    rolePatterns.some(p => p.test(h))
  );
  if (roleHeadings.length >= 3) {
    factors.push({ name: 'role_mixing', score: 2, file: claudePath });
  }

  // ── 3. Tool forcing: "always use X" or "must use X" ────────────────
  const toolForcingRe = /\b(always use|must use)\b/gi;
  const toolForcingMatches = claudeContent.match(toolForcingRe);
  if (toolForcingMatches && toolForcingMatches.length > 0) {
    factors.push({ name: 'tool_forcing', score: 2, file: claudePath });
  }

  // ── 4. Index-content leak: 3+ code blocks OR 2+ long paragraphs ───
  const codeBlockRe = /^```/gm;
  const codeBlocks = claudeContent.match(codeBlockRe);
  const codeBlockCount = codeBlocks ? Math.floor(codeBlocks.length / 2) : 0;

  // Long paragraphs: non-heading, non-code, non-empty blocks >= 300 chars
  const longParaCount = countLongParagraphs(claudeContent, 300);

  if (codeBlockCount >= 3 || longParaCount >= 2) {
    factors.push({ name: 'index_content_leak', score: 2, file: claudePath });
  }

  // ── 5. No docs separation: 30+ lines, no relative links ───────────
  if (claudeLines.length >= 30 && relativeLinks.length === 0) {
    factors.push({ name: 'no_docs_separation', score: 1, file: claudePath });
  }

  // ── Resolve linked files and check existence ───────────────────────
  const FAT_DOC_CAP = 10;
  const allFatDocs = [];
  const contextFileName = path.basename(claudePath);

  const resolvedLinks = relativeLinks.map(link => ({
    raw: link,
    abs: path.resolve(root, link),
  }));

  for (const link of resolvedLinks) {
    const exists = await fileExists(link.abs);

    // ── 7. Broken link ──────────────────────────────────────────────
    if (!exists) {
      factors.push({ name: 'broken_link', score: 2, file: link.abs });
      continue;
    }

    // ── 8. Headerless doc ───────────────────────────────────────────
    const content = await fs.readFile(link.abs, 'utf8');
    if (!content.trimStart().startsWith('#')) {
      factors.push({ name: 'headerless_doc', score: 1, file: link.abs });
    }

    // ── 9. Fat doc: linked doc >= 200 lines ─────────────────────────
    const lines = content.split('\n');
    if (lines.length >= 200) {
      allFatDocs.push(link.abs);
    }
  }

  // ── 6. Orphan docs: files in docs/ not linked from context file ────
  const ORPHAN_CAP = 10;
  const docsDir = path.join(root, 'docs');
  const docsExist = await fileExists(docsDir);
  if (docsExist) {
    const docFiles = await listMdFiles(docsDir, root, config.ignore);
    const linkedAbsPaths = new Set(
      resolvedLinks.map(l => l.abs)
    );
    const orphanFiles = docFiles.filter(f => !linkedAbsPaths.has(f));

    const capped = orphanFiles.slice(0, ORPHAN_CAP);
    for (const docFile of capped) {
      factors.push({ name: 'orphan_doc', score: 1, file: docFile });

      // Also check fat_doc for orphans
      const content = await fs.readFile(docFile, 'utf8');
      const lines = content.split('\n');
      if (lines.length >= 200) {
        allFatDocs.push(docFile);
      }
    }

    if (orphanFiles.length > ORPHAN_CAP) {
      factors.push({
        name: 'orphan_doc_overflow',
        score: 0,
        file: docsDir,
        detail: `${orphanFiles.length - ORPHAN_CAP} additional orphan docs not scored`,
      });
    }
  }

  // ── Fat doc factors (capped) ────────────────────────────────────────
  const cappedFat = allFatDocs.slice(0, FAT_DOC_CAP);
  for (const file of cappedFat) {
    factors.push({ name: 'fat_doc', score: 2, file });
  }
  if (allFatDocs.length > FAT_DOC_CAP) {
    factors.push({
      name: 'fat_doc_overflow',
      score: 0,
      file: docsDir || root,
      detail: `${allFatDocs.length - FAT_DOC_CAP} additional fat docs not scored`,
    });
  }

  // ── Calculate total and rating ─────────────────────────────────────
  const total = factors.reduce((sum, f) => sum + f.score, 0);
  const rating = total <= 2 ? 'Safe' : total <= 5 ? 'Risk' : 'High Over-Specification';

  return { factors, total, rating };
}

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Count paragraphs >= charThreshold characters in markdown content,
 * excluding code blocks and headings.
 */
function countLongParagraphs(content, charThreshold) {
  // Strip code blocks
  const stripped = content.replace(/```[\s\S]*?```/g, '');
  const lines = stripped.split('\n');

  let count = 0;
  let currentPara = '';

  for (const line of lines) {
    const trimmed = line.trim();
    // Heading or blank line = paragraph break
    if (trimmed === '' || trimmed.startsWith('#')) {
      if (currentPara.length >= charThreshold) {
        count++;
      }
      currentPara = '';
    } else {
      currentPara += (currentPara ? ' ' : '') + trimmed;
    }
  }
  // Check last paragraph
  if (currentPara.length >= charThreshold) {
    count++;
  }

  return count;
}

// ── CLI entry point ───────────────────────────────────────────────────
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
    } else if (!args[i].startsWith('--')) {
      rootPath = args[i];
    }
  }

  calculateCCS(rootPath, { contextFile })
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.total > 0 ? 1 : 0);
    })
    .catch(err => {
      console.error(err.message);
      process.exit(2);
    });
}
