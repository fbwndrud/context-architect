import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractStatements, buildProbeBatches } from '../../tools/knowledge-probe.mjs';

describe('extractStatements', () => {
  it('extracts directive statements from markdown', () => {
    const content = `# Rules
Use PascalCase for components.
API errors must use AppError class.
Deploy with ./scripts/deploy.sh.

## Links
See [docs](docs/arch.md).`;

    const stmts = extractStatements(content);
    assert.ok(stmts.length >= 3);
    assert.ok(stmts.some(s => s.includes('PascalCase')));
    assert.ok(stmts.some(s => s.includes('AppError')));
    assert.ok(stmts.some(s => s.includes('deploy.sh')));
  });

  it('ignores headings, links-only lines, and empty lines', () => {
    const content = `# Title

See [link](file.md).

`;
    const stmts = extractStatements(content);
    assert.equal(stmts.length, 0);
  });

  it('ignores very short lines (under 10 chars)', () => {
    const content = `# Title
Yes.
No.
This is a real directive statement about coding.`;
    const stmts = extractStatements(content);
    assert.equal(stmts.length, 1);
    assert.ok(stmts[0].includes('directive'));
  });

  it('handles code blocks by ignoring them', () => {
    const content = `# Config
Run this command: npm test

\`\`\`json
{ "key": "value" }
\`\`\`

Always use strict mode in TypeScript.`;
    const stmts = extractStatements(content);
    assert.ok(stmts.some(s => s.includes('npm test')));
    assert.ok(stmts.some(s => s.includes('strict mode')));
    assert.ok(!stmts.some(s => s.includes('"key"')));
  });

  it('returns string array (not objects)', () => {
    const content = `# Rules
Use PascalCase for components.`;
    const stmts = extractStatements(content);
    assert.ok(stmts.length > 0);
    assert.equal(typeof stmts[0], 'string');
  });
});

describe('buildProbeBatches', () => {
  it('splits statements into batches of default size 10', () => {
    const stmts = Array.from({ length: 12 }, (_, i) => `Statement number ${i + 1} about coding.`);
    const batches = buildProbeBatches(stmts);
    assert.equal(batches.length, 2);
    assert.equal(batches[0].statements.length, 10);
    assert.equal(batches[1].statements.length, 2);
  });

  it('returns empty array for empty input', () => {
    const batches = buildProbeBatches([]);
    assert.deepEqual(batches, []);
  });

  it('respects custom batchSize', () => {
    const stmts = Array.from({ length: 12 }, (_, i) => `Statement number ${i + 1} about coding.`);
    const batches = buildProbeBatches(stmts, 5);
    assert.equal(batches.length, 3);
    assert.equal(batches[0].statements.length, 5);
    assert.equal(batches[1].statements.length, 5);
    assert.equal(batches[2].statements.length, 2);
  });

  it('includes numbered statements in prompt', () => {
    const stmts = ['Use PascalCase for components.', 'Always run tests before commit.'];
    const batches = buildProbeBatches(stmts);
    assert.equal(batches.length, 1);
    assert.ok(batches[0].prompt.includes('1. Use PascalCase for components.'));
    assert.ok(batches[0].prompt.includes('2. Always run tests before commit.'));
  });

  it('has correct output structure', () => {
    const stmts = ['Use PascalCase for components.'];
    const batches = buildProbeBatches(stmts);
    assert.equal(batches.length, 1);
    assert.equal(batches[0].batch_id, 1);
    assert.ok(Array.isArray(batches[0].statements));
    assert.equal(typeof batches[0].prompt, 'string');
  });

  it('prompt contains classification instructions', () => {
    const stmts = ['Use PascalCase for components.'];
    const batches = buildProbeBatches(stmts);
    assert.ok(batches[0].prompt.includes('REDUNDANT'));
    assert.ok(batches[0].prompt.includes('UNIQUE'));
    assert.ok(batches[0].prompt.includes('REVIEW'));
  });
});
