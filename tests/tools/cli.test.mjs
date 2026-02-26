import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const exec = promisify(execFile);
const NODE = process.execPath;
const TOOLS = path.resolve('tools');

describe('CLI: ccs-score.mjs', () => {
  it('outputs valid JSON for clean project', async () => {
    const { stdout } = await exec(NODE, [`${TOOLS}/ccs-score.mjs`, 'tests/fixtures/clean-project']);
    const result = JSON.parse(stdout);
    assert.equal(result.total, 0);
    assert.equal(result.rating, 'Safe');
  });

  it('exits 1 for over-specified project', async () => {
    try {
      await exec(NODE, [`${TOOLS}/ccs-score.mjs`, 'tests/fixtures/over-specified']);
      assert.fail('Should have exited with code 1');
    } catch (err) {
      assert.equal(err.code, 1);
      const result = JSON.parse(err.stdout);
      assert.ok(result.total >= 6);
    }
  });

  it('handles missing CLAUDE.md directory', async () => {
    const { stdout } = await exec(NODE, [`${TOOLS}/ccs-score.mjs`, 'tests/fixtures']);
    const result = JSON.parse(stdout);
    assert.equal(result.total, 0);
  });
});

describe('CLI: detect-antipatterns.mjs', () => {
  it('rejects invalid phase', async () => {
    try {
      await exec(NODE, [`${TOOLS}/detect-antipatterns.mjs`, '--phase', 'invalid', '--root', '.']);
      assert.fail('Should have exited with code 2');
    } catch (err) {
      assert.equal(err.code, 2);
      assert.ok(err.stderr.includes('structure'));
      assert.ok(err.stderr.includes('docs'));
      assert.ok(err.stderr.includes('links'));
    }
  });

  it('outputs valid JSON for structure phase', async () => {
    const { stdout } = await exec(NODE, [
      `${TOOLS}/detect-antipatterns.mjs`,
      '--phase', 'structure',
      '--root', 'tests/fixtures/clean-project'
    ]);
    const result = JSON.parse(stdout);
    assert.equal(result.phase, 'structure');
    assert.ok(Array.isArray(result.findings));
  });
});

describe('CLI: knowledge-probe.mjs', () => {
  it('requires --extract flag', async () => {
    try {
      await exec(NODE, [`${TOOLS}/knowledge-probe.mjs`, '--root', '.']);
      assert.fail('Should have exited with code 2');
    } catch (err) {
      assert.equal(err.code, 2);
      assert.ok(err.stderr.includes('--extract'));
    }
  });

  it('outputs JSON string array with --extract', async () => {
    const { stdout } = await exec(NODE, [
      `${TOOLS}/knowledge-probe.mjs`,
      '--root', 'tests/fixtures/over-specified',
      '--extract'
    ]);
    const result = JSON.parse(stdout);
    assert.ok(Array.isArray(result));
    assert.ok(result.length > 0);
    assert.equal(typeof result[0], 'string', 'CLI should output raw statements as strings');
  });

  it('errors when CLAUDE.md not found', async () => {
    try {
      await exec(NODE, [`${TOOLS}/knowledge-probe.mjs`, '--root', 'tests/fixtures', '--extract']);
      assert.fail('Should have exited with code 2');
    } catch (err) {
      assert.equal(err.code, 2);
    }
  });

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
});

describe('CLI: --context-file flag', () => {
  it('ccs-score.mjs accepts --context-file', async () => {
    const { stdout } = await exec(NODE, [
      `${TOOLS}/ccs-score.mjs`,
      '--root', 'tests/fixtures/clean-project',
      '--context-file', 'CLAUDE.md'
    ]);
    const result = JSON.parse(stdout);
    assert.equal(result.total, 0);
  });

  it('detect-antipatterns.mjs accepts --context-file', async () => {
    const { stdout } = await exec(NODE, [
      `${TOOLS}/detect-antipatterns.mjs`,
      '--phase', 'structure',
      '--root', 'tests/fixtures/clean-project',
      '--context-file', 'CLAUDE.md'
    ]);
    const result = JSON.parse(stdout);
    assert.equal(result.phase, 'structure');
  });
});

describe('CLI: token-estimate.mjs', () => {
  it('outputs valid JSON with expected structure', async () => {
    const { stdout } = await exec(NODE, [
      `${TOOLS}/token-estimate.mjs`,
      '--root', 'tests/fixtures/clean-project'
    ]);
    const result = JSON.parse(stdout);
    assert.equal(typeof result.total_chars, 'number');
    assert.equal(typeof result.estimated_tokens, 'number');
    assert.ok(Array.isArray(result.files));
    assert.ok(result.files.length > 0);
  });

  it('respects --context-file flag', async () => {
    const { stdout } = await exec(NODE, [
      `${TOOLS}/token-estimate.mjs`,
      '--root', 'tests/fixtures/clean-project',
      '--context-file', 'CLAUDE.md'
    ]);
    const result = JSON.parse(stdout);
    assert.ok(result.total_chars > 0);
  });

  it('returns zeros for missing context file', async () => {
    const { stdout } = await exec(NODE, [
      `${TOOLS}/token-estimate.mjs`,
      '--root', 'tests/fixtures'
    ]);
    const result = JSON.parse(stdout);
    assert.equal(result.total_chars, 0);
    assert.equal(result.estimated_tokens, 0);
  });
});
