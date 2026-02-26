import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { estimateTokens } from '../../tools/token-estimate.mjs';

describe('estimateTokens', () => {
  it('returns token estimate for clean project', async () => {
    const result = await estimateTokens('tests/fixtures/clean-project');
    assert.equal(typeof result.total_chars, 'number');
    assert.equal(typeof result.estimated_tokens, 'number');
    assert.ok(result.total_chars > 0);
    assert.equal(result.estimated_tokens, Math.ceil(result.total_chars / 4));
  });

  it('includes per-file breakdown with roles', async () => {
    const result = await estimateTokens('tests/fixtures/clean-project');
    assert.ok(Array.isArray(result.files));
    assert.ok(result.files.length > 0);
    const first = result.files[0];
    assert.equal(typeof first.file, 'string');
    assert.equal(typeof first.chars, 'number');
    assert.equal(typeof first.tokens, 'number');
    assert.ok(['index', 'linked'].includes(first.role));
  });

  it('classifies context file as index', async () => {
    const result = await estimateTokens('tests/fixtures/clean-project');
    const index = result.files.find(f => f.file.endsWith('CLAUDE.md'));
    assert.ok(index);
    assert.equal(index.role, 'index');
  });

  it('classifies linked docs as linked', async () => {
    const result = await estimateTokens('tests/fixtures/clean-project');
    const linked = result.files.find(f => f.role === 'linked');
    assert.ok(linked, 'should have at least one linked doc');
  });

  it('returns zero for missing CLAUDE.md', async () => {
    const result = await estimateTokens('tests/fixtures');
    assert.equal(result.total_chars, 0);
    assert.equal(result.estimated_tokens, 0);
    assert.deepEqual(result.files, []);
  });

  it('calculates tokens as Math.ceil(chars / 4)', async () => {
    const result = await estimateTokens('tests/fixtures/clean-project');
    for (const f of result.files) {
      assert.equal(f.tokens, Math.ceil(f.chars / 4));
    }
  });

  it('total_chars equals sum of file chars', async () => {
    const result = await estimateTokens('tests/fixtures/clean-project');
    const sum = result.files.reduce((acc, f) => acc + f.chars, 0);
    assert.equal(result.total_chars, sum);
  });

  it('respects contextFile option', async () => {
    const result = await estimateTokens('tests/fixtures/clean-project', { contextFile: 'CLAUDE.md' });
    assert.ok(result.total_chars > 0);
  });
});
