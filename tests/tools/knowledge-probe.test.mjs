import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractStatements, toProbeQuestions } from '../../tools/knowledge-probe.mjs';

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
});

describe('toProbeQuestions', () => {
  it('converts statements to neutral questions', () => {
    const stmts = ['Use PascalCase for all components.'];
    const questions = toProbeQuestions(stmts, { framework: 'React' });
    assert.equal(questions.length, 1);
    assert.ok(questions[0].question.includes('?'));
    assert.ok(questions[0].original === stmts[0]);
  });

  it('preserves original statement', () => {
    const stmts = ['Deploy with ./scripts/deploy.sh staging.'];
    const questions = toProbeQuestions(stmts, {});
    assert.equal(questions[0].original, stmts[0]);
  });

  it('handles multiple statements', () => {
    const stmts = Array.from({ length: 12 }, (_, i) => `Rule number ${i + 1} about coding.`);
    const questions = toProbeQuestions(stmts, {});
    assert.equal(questions.length, 12);
    questions.forEach(q => {
      assert.ok(q.question);
      assert.ok(q.original);
    });
  });
});
