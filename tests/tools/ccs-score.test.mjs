import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateCCS } from '../../tools/ccs-score.mjs';

describe('calculateCCS', () => {
  it('returns 0 for clean project', async () => {
    const result = await calculateCCS('tests/fixtures/clean-project');
    assert.equal(result.total, 0);
    assert.equal(result.rating, 'Safe');
  });

  it('detects monolith (300+ lines)', async () => {
    const result = await calculateCCS('tests/fixtures/over-specified');
    const monolith = result.factors.find(f => f.name === 'monolith');
    assert.ok(monolith);
    assert.equal(monolith.score, 3);
  });

  it('calculates High Over-Specification for over-specified project', async () => {
    const result = await calculateCCS('tests/fixtures/over-specified');
    assert.ok(result.total >= 6);
    assert.equal(result.rating, 'High Over-Specification');
  });

  it('returns structured output with factors array', async () => {
    const result = await calculateCCS('tests/fixtures/clean-project');
    assert.ok(Array.isArray(result.factors));
    assert.ok(typeof result.total === 'number');
    assert.ok(['Safe', 'Risk', 'High Over-Specification'].includes(result.rating));
  });

  it('detects broken links', async () => {
    const result = await calculateCCS('tests/fixtures/broken-links');
    const brokenLinks = result.factors.filter(f => f.name === 'broken_link');
    assert.equal(brokenLinks.length, 2);
  });

  it('detects orphan docs', async () => {
    const result = await calculateCCS('tests/fixtures/over-specified');
    const orphans = result.factors.filter(f => f.name === 'orphan_doc');
    assert.ok(orphans.length >= 1);
  });

  it('calculates Risk rating for moderate issues', async () => {
    const result = await calculateCCS('tests/fixtures/risk-project');
    assert.ok(result.total >= 3 && result.total <= 5, `Expected Risk range (3-5), got ${result.total}`);
    assert.equal(result.rating, 'Risk');
  });

  it('handles missing CLAUDE.md gracefully', async () => {
    const result = await calculateCCS('tests/fixtures');  // no CLAUDE.md here
    assert.equal(result.total, 0);
    assert.equal(result.rating, 'Safe');
    assert.deepEqual(result.factors, []);
  });

  it('handles empty CLAUDE.md gracefully', async () => {
    const result = await calculateCCS('tests/fixtures/empty-claude');
    assert.equal(result.total, 0);
    assert.equal(result.rating, 'Safe');
  });
});
