import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fitAlternatives, taskFits } from '../src/lib/task-fit.ts';
import { tools } from '../src/data/tools.ts';

const repoOf = value => {
  const url = new URL(value);
  assert.equal(url.protocol, 'https:', value);
  assert.equal(url.hostname, 'github.com', value);
  return url.pathname.split('/').slice(1, 3).join('/').toLowerCase();
};

test('Task-fit reviews cite each project\'s own repository and compare listed CLIs', () => {
  assert.ok(taskFits.ripgrep && taskFits['agent-browser'], 'the reviewed profiles from #16 have task-fit content');
  for (const [slug, fit] of Object.entries(taskFits)) {
    const tool = tools.find(candidate => candidate.slug === slug);
    assert.ok(tool, `${slug} is listed`);
    assert.match(fit.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
    for (const claim of [fit.bestFor, fit.lookElsewhere]) {
      assert.ok(claim.text.trim().length > 20, `${slug} claim has content`);
      assert.equal(repoOf(claim.source), tool.repo.toLowerCase(), `${slug} claims cite its own repository`);
    }
    const resolved = fitAlternatives(fit, tools);
    assert.equal(resolved.length, fit.alternatives.length, `${slug} alternatives are all listed`);
    assert.ok(resolved.length >= 2, `${slug} explains at least two related tools`);
    for (const { tool: other, source, text } of resolved) {
      assert.notEqual(other.slug, slug);
      assert.ok(text.trim().length > 20);
      assert.equal(repoOf(source), other.repo.toLowerCase(), `${other.slug} comparison cites its own repository`);
    }
  }
});

test('Alternatives that leave the catalog are dropped rather than linked', () => {
  const fit = taskFits.ripgrep;
  assert.deepEqual(fitAlternatives(fit, tools.filter(tool => tool.slug !== 'fd')).map(item => item.slug), ['ast-grep']);
});
