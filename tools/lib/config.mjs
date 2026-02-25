import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULTS = {
  context_files: ['CLAUDE.md'],
  reference_docs: [],
  ignore: [],
  probe_model: 'sonnet',
};

/**
 * Load `.context-architect.json` from `rootPath`.
 * Returns merged config (file values override defaults).
 * If the file is missing or invalid JSON, returns defaults.
 *
 * @param {string} rootPath — absolute or relative project root
 * @returns {Promise<{ context_files: string[], reference_docs: string[], ignore: string[], probe_model: string }>}
 */
export async function loadConfig(rootPath) {
  const root = path.resolve(rootPath);
  const configPath = path.join(root, '.context-architect.json');

  try {
    const raw = await fs.readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw);

    return {
      context_files: Array.isArray(parsed.context_files) ? parsed.context_files : DEFAULTS.context_files,
      reference_docs: Array.isArray(parsed.reference_docs) ? parsed.reference_docs : DEFAULTS.reference_docs,
      ignore: Array.isArray(parsed.ignore) ? parsed.ignore : DEFAULTS.ignore,
      probe_model: typeof parsed.probe_model === 'string' ? parsed.probe_model : DEFAULTS.probe_model,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

/**
 * Resolve the primary context file path.
 * Priority: CLI override > config `context_files[0]` > 'CLAUDE.md'
 *
 * @param {string} root — absolute project root
 * @param {string|undefined} cliOverride — value from `--context-file` flag
 * @param {{ context_files: string[] }} config — loaded config
 * @returns {string} absolute path to the context file
 */
export function resolveContextFile(root, cliOverride, config) {
  const file = cliOverride || (config.context_files && config.context_files[0]) || 'CLAUDE.md';
  return path.resolve(root, file);
}

/**
 * Check whether a file path should be ignored based on ignore patterns.
 *
 * @param {string} filePath — absolute file path
 * @param {string} root — absolute project root
 * @param {string[]} ignorePatterns — glob patterns from config
 * @returns {boolean}
 */
export function shouldIgnore(filePath, root, ignorePatterns) {
  if (!ignorePatterns || ignorePatterns.length === 0) return false;
  const rel = path.relative(root, filePath);
  return ignorePatterns.some(pattern => matchGlob(rel, pattern));
}

/**
 * Simple glob matcher supporting *, **, and ? without external dependencies.
 *
 * @param {string} str — string to test (typically a relative path)
 * @param {string} pattern — glob pattern
 * @returns {boolean}
 */
export function matchGlob(str, pattern) {
  // Normalise separators
  const s = str.replace(/\\/g, '/');
  const p = pattern.replace(/\\/g, '/');

  const regex = globToRegex(p);
  return regex.test(s);
}

function globToRegex(pattern) {
  let re = '';
  let i = 0;

  while (i < pattern.length) {
    const c = pattern[i];

    if (c === '*') {
      if (pattern[i + 1] === '*') {
        // ** — match any number of path segments
        if (pattern[i + 2] === '/') {
          re += '(?:.+/)?';
          i += 3;
        } else {
          re += '.*';
          i += 2;
        }
      } else {
        // * — match anything except /
        re += '[^/]*';
        i++;
      }
    } else if (c === '?') {
      re += '[^/]';
      i++;
    } else if (c === '.') {
      re += '\\.';
      i++;
    } else {
      re += c;
      i++;
    }
  }

  return new RegExp(`^${re}$`);
}

/**
 * Check if a path exists.
 *
 * @param {string} p — path to check
 * @returns {Promise<boolean>}
 */
export async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Recursively list all .md files under a directory,
 * optionally filtering out ignored paths.
 *
 * @param {string} dir — directory to scan
 * @param {string} [root] — project root for ignore matching
 * @param {string[]} [ignorePatterns] — glob patterns to exclude
 * @returns {Promise<string[]>}
 */
export async function listMdFiles(dir, root, ignorePatterns) {
  const results = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true, recursive: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith('.md')) continue;
      const parent = entry.parentPath || entry.path;
      const fullPath = path.join(parent, entry.name);
      if (root && ignorePatterns && shouldIgnore(fullPath, root, ignorePatterns)) continue;
      results.push(fullPath);
    }
  } catch {
    // directory not readable — skip
  }
  return results;
}
