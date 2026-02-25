import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectAntipatterns } from '../../tools/detect-antipatterns.mjs';

describe('detectAntipatterns — phase: structure', () => {
  it('finds no issues in clean project', async () => {
    const result = await detectAntipatterns('tests/fixtures/clean-project', 'structure');
    assert.equal(result.findings.length, 0);
  });

  it('detects monolith in over-specified project', async () => {
    const result = await detectAntipatterns('tests/fixtures/over-specified', 'structure');
    const monolith = result.findings.find(f => f.type === 'monolith');
    assert.ok(monolith);
  });

  it('detects tool forcing', async () => {
    const result = await detectAntipatterns('tests/fixtures/over-specified', 'structure');
    const toolForcing = result.findings.find(f => f.type === 'tool_forcing');
    assert.ok(toolForcing);
  });

  it('detects role mixing', async () => {
    const result = await detectAntipatterns('tests/fixtures/over-specified', 'structure');
    const roleMixing = result.findings.find(f => f.type === 'role_mixing');
    assert.ok(roleMixing);
  });

  it('detects index-content leak', async () => {
    const result = await detectAntipatterns('tests/fixtures/over-specified', 'structure');
    const leak = result.findings.find(f => f.type === 'index_content_leak');
    assert.ok(leak);
  });
});

describe('detectAntipatterns — phase: docs', () => {
  it('finds no doc issues in clean project', async () => {
    const result = await detectAntipatterns('tests/fixtures/clean-project', 'docs');
    assert.equal(result.findings.length, 0);
  });
});

describe('detectAntipatterns — phase: links', () => {
  it('detects broken links', async () => {
    const result = await detectAntipatterns('tests/fixtures/broken-links', 'links');
    const broken = result.findings.filter(f => f.type === 'broken_link');
    assert.equal(broken.length, 2);
  });

  it('detects orphan docs', async () => {
    const result = await detectAntipatterns('tests/fixtures/over-specified', 'links');
    const orphan = result.findings.find(f => f.type === 'orphan_doc');
    assert.ok(orphan);
  });

  it('finds no link issues in clean project', async () => {
    const result = await detectAntipatterns('tests/fixtures/clean-project', 'links');
    assert.equal(result.findings.length, 0);
  });
});
