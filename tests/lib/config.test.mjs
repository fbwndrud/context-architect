import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { loadConfig, resolveContextFile, matchGlob, shouldIgnore, fileExists, listMdFiles } from '../../tools/lib/config.mjs';

describe('loadConfig', () => {
  it('returns defaults when no config file exists', async () => {
    const config = await loadConfig('tests/fixtures/clean-project');
    assert.deepEqual(config.context_files, ['CLAUDE.md']);
    assert.deepEqual(config.ignore, []);
    assert.equal(config.probe_model, 'sonnet');
  });

  it('loads config from .context-architect.json', async () => {
    const config = await loadConfig('tests/fixtures/with-config');
    assert.deepEqual(config.context_files, ['CLAUDE.md']);
    assert.deepEqual(config.ignore, ['docs/plans/**']);
    assert.equal(config.probe_model, 'haiku');
    assert.deepEqual(config.reference_docs, ['docs/conventions.md']);
  });

  it('returns defaults for invalid JSON', async () => {
    const config = await loadConfig('tests/fixtures/bad-config');
    assert.deepEqual(config.context_files, ['CLAUDE.md']);
    assert.deepEqual(config.ignore, []);
    assert.equal(config.probe_model, 'sonnet');
  });
});

describe('resolveContextFile', () => {
  it('uses CLI override when provided', () => {
    const root = '/project';
    const result = resolveContextFile(root, 'custom.md', { context_files: ['CLAUDE.md'] });
    assert.equal(result, path.resolve('/project', 'custom.md'));
  });

  it('falls back to config context_files[0]', () => {
    const root = '/project';
    const result = resolveContextFile(root, undefined, { context_files: ['AGENTS.md'] });
    assert.equal(result, path.resolve('/project', 'AGENTS.md'));
  });

  it('defaults to CLAUDE.md when no override and no config', () => {
    const root = '/project';
    const result = resolveContextFile(root, undefined, { context_files: [] });
    assert.equal(result, path.resolve('/project', 'CLAUDE.md'));
  });
});

describe('matchGlob', () => {
  it('matches simple wildcard', () => {
    assert.ok(matchGlob('foo.md', '*.md'));
    assert.ok(!matchGlob('foo.txt', '*.md'));
  });

  it('matches double-star glob', () => {
    assert.ok(matchGlob('docs/plans/v1.md', 'docs/plans/**'));
    assert.ok(matchGlob('docs/plans/deep/nested.md', 'docs/plans/**'));
    assert.ok(!matchGlob('docs/conventions.md', 'docs/plans/**'));
  });

  it('matches double-star with trailing pattern', () => {
    assert.ok(matchGlob('src/a/b.test.mjs', 'src/**/*.test.mjs'));
    assert.ok(!matchGlob('src/a/b.mjs', 'src/**/*.test.mjs'));
  });

  it('matches question mark', () => {
    assert.ok(matchGlob('doc1.md', 'doc?.md'));
    assert.ok(!matchGlob('doc12.md', 'doc?.md'));
  });
});

describe('shouldIgnore', () => {
  it('returns false for empty patterns', () => {
    assert.ok(!shouldIgnore('/project/docs/foo.md', '/project', []));
  });

  it('ignores matching paths', () => {
    assert.ok(shouldIgnore('/project/docs/plans/v1.md', '/project', ['docs/plans/**']));
  });

  it('does not ignore non-matching paths', () => {
    assert.ok(!shouldIgnore('/project/docs/conventions.md', '/project', ['docs/plans/**']));
  });
});

describe('fileExists', () => {
  it('returns true for existing file', async () => {
    assert.ok(await fileExists('tests/fixtures/clean-project/CLAUDE.md'));
  });

  it('returns false for non-existent file', async () => {
    assert.ok(!(await fileExists('tests/fixtures/nonexistent.md')));
  });
});

describe('listMdFiles', () => {
  it('lists .md files recursively', async () => {
    const root = path.resolve('tests/fixtures/with-config');
    const files = await listMdFiles(path.join(root, 'docs'));
    assert.ok(files.length >= 2); // conventions.md + plans/v1.md
  });

  it('filters ignored paths when root and patterns provided', async () => {
    const root = path.resolve('tests/fixtures/with-config');
    const files = await listMdFiles(path.join(root, 'docs'), root, ['docs/plans/**']);
    assert.ok(files.some(f => f.includes('conventions.md')));
    assert.ok(!files.some(f => f.includes('plans')));
  });

  it('returns empty array for non-existent directory', async () => {
    const files = await listMdFiles('/nonexistent/dir');
    assert.deepEqual(files, []);
  });
});
