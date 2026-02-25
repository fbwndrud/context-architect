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

  it('outputs valid JSON array with --extract', async () => {
    const { stdout } = await exec(NODE, [
      `${TOOLS}/knowledge-probe.mjs`,
      '--root', 'tests/fixtures/over-specified',
      '--extract'
    ]);
    const result = JSON.parse(stdout);
    assert.ok(Array.isArray(result));
    assert.ok(result.length > 0);
    assert.ok(result[0].original);
    assert.ok(result[0].question);
  });

  it('errors when CLAUDE.md not found', async () => {
    try {
      await exec(NODE, [`${TOOLS}/knowledge-probe.mjs`, '--root', 'tests/fixtures', '--extract']);
      assert.fail('Should have exited with code 2');
    } catch (err) {
      assert.equal(err.code, 2);
    }
  });
});
