import fs from 'node:fs/promises';
import path from 'node:path';
import { loadConfig, resolveContextFile, fileExists, listMdFiles } from './lib/config.mjs';

/**
 * 3-phase anti-pattern detector for CLAUDE.md context files.
 *
 * Phases:
 *   - structure: analyses CLAUDE.md for structural anti-patterns
 *   - docs:      checks linked docs and docs/ directory for doc-level issues
 *   - links:     verifies link integrity and finds orphan documents
 *
 * @param {string} rootPath — path to project root (relative or absolute)
 * @param {'structure' | 'docs' | 'links'} phase — detection phase to run
 * @param {object} [options]
 * @param {string} [options.contextFile] — override context file path
 * @returns {Promise<{ phase: string, findings: Array<{ type: string, severity: string, file: string, line?: number, message: string }> }>}
 */
export async function detectAntipatterns(rootPath, phase, options = {}) {
  const root = path.resolve(rootPath);
  const config = await loadConfig(root);
  const claudePath = resolveContextFile(root, options.contextFile, config);

  let claudeContent;
  try {
    claudeContent = await fs.readFile(claudePath, 'utf8');
  } catch {
    return { phase, findings: [] };
  }

  const claudeLines = claudeContent.split('\n');

  // Extract relative links from CLAUDE.md
  const linkRe = /\[.*?\]\(((?!https?:\/\/).*?)\)/g;
  const relativeLinks = [];
  let m;
  while ((m = linkRe.exec(claudeContent)) !== null) {
    relativeLinks.push(m[1]);
  }

  switch (phase) {
    case 'structure':
      return { phase, findings: analyseStructure(claudeContent, claudeLines, claudePath) };
    case 'docs':
      return { phase, findings: await analyseDocs(root, relativeLinks, config) };
    case 'links':
      return { phase, findings: await analyseLinks(root, claudeContent, relativeLinks, claudePath, config) };
    default:
      return { phase, findings: [] };
  }
}

// ── Phase: structure ──────────────────────────────────────────────────────

function analyseStructure(content, lines, filePath) {
  const findings = [];

  // 1. Monolith: file 300+ lines
  if (lines.length >= 300) {
    findings.push({
      type: 'monolith',
      severity: 'high',
      file: filePath,
      line: 1,
      message: `CLAUDE.md is ${lines.length} lines — consider splitting into focused docs`,
    });
  }

  // 2. Role mixing: 3+ different role-indicator headings
  const roleCategories = [
    { pattern: /style|naming|convention/i, label: 'style/naming' },
    { pattern: /tool|build/i, label: 'tools/build' },
    { pattern: /rule|behavior|behaviour/i, label: 'rules/behavior' },
    { pattern: /architect|design/i, label: 'architecture/design' },
    { pattern: /test/i, label: 'testing' },
    { pattern: /deploy/i, label: 'deployment' },
    { pattern: /api/i, label: 'api' },
    { pattern: /git/i, label: 'git' },
  ];

  const headingRe = /^#{1,3}\s+(.+)/gm;
  const headings = [...content.matchAll(headingRe)].map(h => h[1]);
  const matchedCategories = new Set();
  for (const heading of headings) {
    for (const cat of roleCategories) {
      if (cat.pattern.test(heading)) {
        matchedCategories.add(cat.label);
      }
    }
  }

  if (matchedCategories.size >= 3) {
    findings.push({
      type: 'role_mixing',
      severity: 'medium',
      file: filePath,
      line: 1,
      message: `CLAUDE.md mixes ${matchedCategories.size} roles: ${[...matchedCategories].join(', ')}`,
    });
  }

  // 3. Tool forcing: "always use X" or "must use X"
  const toolForcingRe = /\b(always use|must use)\b/gi;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(toolForcingRe);
    if (match) {
      findings.push({
        type: 'tool_forcing',
        severity: 'medium',
        file: filePath,
        line: i + 1,
        message: `Tool forcing: "${lines[i].trim()}"`,
      });
    }
  }

  // 4. Directory dump: tree output (├── or └── or multiple indented paths)
  const treeLineRe = /[├└│─]/;
  let treeLineCount = 0;
  let treeStartLine = 0;
  for (let i = 0; i < lines.length; i++) {
    if (treeLineRe.test(lines[i])) {
      if (treeLineCount === 0) treeStartLine = i + 1;
      treeLineCount++;
    }
  }
  if (treeLineCount >= 5) {
    findings.push({
      type: 'directory_dump',
      severity: 'low',
      file: filePath,
      line: treeStartLine,
      message: `Directory tree dump detected (${treeLineCount} tree-output lines)`,
    });
  }

  // 5. Lint dump: section with many specific lint rule references
  const lintRuleRe = /\b(no-unused-vars|no-console|semi|quotes|indent|eqeqeq|@typescript-eslint\/[\w-]+|eslint-disable|eslint-enable)\b/g;
  const lintMatches = content.match(lintRuleRe);
  if (lintMatches && lintMatches.length >= 5) {
    findings.push({
      type: 'lint_dump',
      severity: 'low',
      file: filePath,
      line: 1,
      message: `${lintMatches.length} lint rule references found — consider linking to eslint config`,
    });
  }

  // 6. README echo: detect if large portions duplicate README.md content
  // (checked separately if README.md exists alongside CLAUDE.md)
  // Deferred — requires reading README.md; handled below in a follow-up pass

  // 7. Philosophy essay: long paragraphs (500+ chars) with abstract language
  const abstractRe = /\b(philosophy|principle|believe|vision|paradigm|ethos|fundamental|holistic|comprehensive)\b/i;
  const paragraphs = extractParagraphs(content);
  for (const para of paragraphs) {
    if (para.text.length >= 500 && abstractRe.test(para.text)) {
      findings.push({
        type: 'philosophy_essay',
        severity: 'low',
        file: filePath,
        line: para.startLine,
        message: `Long abstract paragraph (${para.text.length} chars) — move to a design doc`,
      });
    }
  }

  // 8. Index-content leak: 3+ code blocks or 2+ paragraphs over 300 chars
  const codeBlockRe = /^```/gm;
  const codeBlocks = content.match(codeBlockRe);
  const codeBlockCount = codeBlocks ? Math.floor(codeBlocks.length / 2) : 0;
  const longParaCount = paragraphs.filter(p => p.text.length >= 300).length;

  if (codeBlockCount >= 3 || longParaCount >= 2) {
    findings.push({
      type: 'index_content_leak',
      severity: 'high',
      file: filePath,
      line: 1,
      message: `Index file contains heavy content (${codeBlockCount} code blocks, ${longParaCount} long paragraphs)`,
    });
  }

  return findings;
}

// ── Phase: docs ───────────────────────────────────────────────────────────

async function analyseDocs(root, relativeLinks, config) {
  const findings = [];

  // Collect all doc files to check: linked docs + docs/ directory contents
  const docPaths = new Set();

  // Add linked docs
  for (const link of relativeLinks) {
    const abs = path.resolve(root, link);
    if (abs.endsWith('.md')) {
      docPaths.add(abs);
    }
  }

  // Add docs/ directory contents
  const docsDir = path.join(root, 'docs');
  if (await fileExists(docsDir)) {
    const files = await listMdFiles(docsDir, root, config.ignore);
    for (const f of files) {
      docPaths.add(f);
    }
  }

  for (const docPath of docPaths) {
    if (!(await fileExists(docPath))) continue;

    let content;
    try {
      content = await fs.readFile(docPath, 'utf8');
    } catch {
      continue;
    }

    // Headerless doc: doesn't start with #
    if (!content.trimStart().startsWith('#')) {
      findings.push({
        type: 'headerless_doc',
        severity: 'medium',
        file: docPath,
        line: 1,
        message: 'Document does not start with a heading',
      });
    }

    // Fat doc: 200+ lines
    const lineCount = content.split('\n').length;
    if (lineCount >= 200) {
      findings.push({
        type: 'fat_doc',
        severity: 'medium',
        file: docPath,
        line: 1,
        message: `Document is ${lineCount} lines — consider splitting`,
      });
    }
  }

  return findings;
}

// ── Phase: links ──────────────────────────────────────────────────────────

async function analyseLinks(root, claudeContent, relativeLinks, claudePath, config) {
  const findings = [];
  const claudeLines = claudeContent.split('\n');

  // Broken links: context file links to non-existent files
  for (const link of relativeLinks) {
    const abs = path.resolve(root, link);
    if (!(await fileExists(abs))) {
      // Find the line number where this link appears
      let lineNum = 1;
      for (let i = 0; i < claudeLines.length; i++) {
        if (claudeLines[i].includes(link)) {
          lineNum = i + 1;
          break;
        }
      }
      findings.push({
        type: 'broken_link',
        severity: 'high',
        file: claudePath,
        line: lineNum,
        message: `Broken link: ${link} does not exist`,
      });
    }
  }

  // Orphan docs: .md files in docs/ not linked from context file
  const docsDir = path.join(root, 'docs');
  if (await fileExists(docsDir)) {
    const docFiles = await listMdFiles(docsDir, root, config.ignore);
    const linkedAbsPaths = new Set(
      relativeLinks.map(link => path.resolve(root, link))
    );

    for (const docFile of docFiles) {
      if (!linkedAbsPaths.has(docFile)) {
        findings.push({
          type: 'orphan_doc',
          severity: 'medium',
          file: docFile,
          line: 1,
          message: `${path.basename(docFile)} is not linked from CLAUDE.md`,
        });
      }
    }
  }

  return findings;
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Extract paragraphs from markdown content, skipping code blocks and headings.
 * Returns array of { text, startLine } objects.
 */
function extractParagraphs(content) {
  const lines = content.split('\n');
  const paragraphs = [];
  let currentText = '';
  let startLine = 1;
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Track code blocks
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      // Flush current paragraph
      if (currentText) {
        paragraphs.push({ text: currentText, startLine });
        currentText = '';
      }
      continue;
    }

    if (inCodeBlock) continue;

    // Heading or blank line = paragraph break
    if (trimmed === '' || trimmed.startsWith('#')) {
      if (currentText) {
        paragraphs.push({ text: currentText, startLine });
        currentText = '';
      }
    } else {
      if (!currentText) {
        startLine = i + 1;
      }
      currentText += (currentText ? ' ' : '') + trimmed;
    }
  }

  // Flush last paragraph
  if (currentText) {
    paragraphs.push({ text: currentText, startLine });
  }

  return paragraphs;
}

// ── CLI entry point ───────────────────────────────────────────────────────

const isMain = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

if (isMain) {
  const args = process.argv.slice(2);
  let rootPath = '.';
  let phase = 'structure';
  let contextFile;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--root' && args[i + 1]) {
      rootPath = args[++i];
    } else if (args[i] === '--phase' && args[i + 1]) {
      phase = args[++i];
    } else if (args[i] === '--context-file' && args[i + 1]) {
      contextFile = args[++i];
    }
  }

  const validPhases = ['structure', 'docs', 'links'];
  if (!validPhases.includes(phase)) {
    console.error(`Invalid phase "${phase}". Must be one of: ${validPhases.join(', ')}`);
    process.exit(2);
  }

  detectAntipatterns(rootPath, phase, { contextFile })
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.findings.length > 0 ? 1 : 0);
    })
    .catch(err => {
      console.error(err.message);
      process.exit(2);
    });
}
