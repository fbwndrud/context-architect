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

  // Extract relative links from context file (deduplicate)
  const linkRe = /\[.*?\]\(((?!https?:\/\/).*?)\)/g;
  const seen = new Set([ctxPath]);
  let m;
  while ((m = linkRe.exec(ctxContent)) !== null) {
    const abs = path.resolve(root, m[1]);
    if (seen.has(abs)) continue;
    seen.add(abs);
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
