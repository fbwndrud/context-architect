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

describe('detectAntipatterns — phase: structure (edge cases)', () => {
  it('handles missing CLAUDE.md gracefully', async () => {
    const result = await detectAntipatterns('tests/fixtures', 'structure');
    assert.equal(result.findings.length, 0);
  });

  it('detects directory dump', async () => {
    const result = await detectAntipatterns('tests/fixtures/over-specified', 'structure');
    const dirDump = result.findings.find(f => f.type === 'directory_dump');
    assert.ok(dirDump, 'Should detect directory dump pattern');
  });
});

describe('detectAntipatterns — phase: docs (detections)', () => {
  it('detects headerless doc', async () => {
    const result = await detectAntipatterns('tests/fixtures/headerless-doc', 'docs');
    const headerless = result.findings.find(f => f.type === 'headerless_doc');
    assert.ok(headerless, 'Should detect doc without # heading');
  });

  it('detects fat doc (200+ lines)', async () => {
    const result = await detectAntipatterns('tests/fixtures/fat-doc', 'docs');
    const fatDoc = result.findings.find(f => f.type === 'fat_doc');
    assert.ok(fatDoc, 'Should detect doc with 200+ lines');
  });
});

describe('detectAntipatterns — edge cases', () => {
  it('handles empty CLAUDE.md', async () => {
    const result = await detectAntipatterns('tests/fixtures/empty-claude', 'structure');
    assert.equal(result.phase, 'structure');
    // Should not crash
  });
});

describe('detectAntipatterns — config integration', () => {
  it('ignores docs matching config ignore patterns (docs phase)', async () => {
    const result = await detectAntipatterns('tests/fixtures/with-config', 'docs');
    const files = result.findings.map(f => f.file);
    assert.ok(!files.some(f => f.includes('plans')), 'Ignored paths should not appear in docs findings');
  });

  it('ignores docs matching config ignore patterns (links phase)', async () => {
    const result = await detectAntipatterns('tests/fixtures/with-config', 'links');
    const orphans = result.findings.filter(f => f.type === 'orphan_doc');
    const orphanFiles = orphans.map(f => f.file);
    assert.ok(!orphanFiles.some(f => f.includes('plans')), 'Ignored paths should not appear as orphans');
  });

  it('accepts options.contextFile override', async () => {
    const result = await detectAntipatterns('tests/fixtures/clean-project', 'structure', { contextFile: 'NONEXISTENT.md' });
    assert.equal(result.findings.length, 0);
  });

  it('caps orphan_doc findings at 10 in links phase', async () => {
    const result = await detectAntipatterns('tests/fixtures/many-orphans', 'links');
    const orphans = result.findings.filter(f => f.type === 'orphan_doc');
    assert.ok(orphans.length <= 10, `Expected <= 10 orphan findings, got ${orphans.length}`);
    const overflow = result.findings.find(f => f.type === 'orphan_doc_overflow');
    assert.ok(overflow, 'Expected orphan_doc_overflow summary finding');
    assert.equal(overflow.severity, 'info');
  });
});
