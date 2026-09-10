import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { filterTools } from '../src/lib/filter.mjs';
import { starWindow } from '../src/lib/star-history.mjs';
import { tools, categories } from '../src/data/tools.ts';
const catalog = JSON.parse(await readFile(new URL('../src/data/catalog.json', import.meta.url)));
const sourceList = JSON.parse(await readFile(new URL('../src/data/cli-source-list.json', import.meta.url)));
test('All 100 supplied CLIs appear exactly once with their original workflow labels', () => {
  assert.deepEqual(sourceList.map(row => row.id), Array.from({ length: 100 }, (_, i) => String(i + 1)));
  const documented = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '10', '11', '12', '13', '14', '16', '17', '20']);
  assert.equal(new Set(sourceList.map(row => row.github_url.toLowerCase())).size, 100);
  assert.equal(new Set(tools.map(tool => tool.repo.toLowerCase())).size, tools.length);
  for (const row of sourceList) {
    const matches = tools.filter(tool => `https://github.com/${tool.repo}`.toLowerCase() === row.github_url.toLowerCase());
    assert.equal(matches.length, 1, row.cli_name);
    const tool = matches[0];
    assert.ok(row.cli_name.trim() && row.description.trim());
    assert.equal(row.agent_ai_workflow_support, documented.has(row.id) ? 'Documented' : 'Not marked in source list');
    assert.equal(tool.agentWorkflowSupport, row.agent_ai_workflow_support);
    assert.ok(filterTools(tools, { query: row.cli_name }).some(result => result.slug === tool.slug), `${row.cli_name} is searchable`);
  }
  for (const tool of tools.filter(tool => tool.sourceListName === null)) {
    assert.equal(tool.agentWorkflowSupport, null, 'CLIs outside the supplied list have no inferred support label');
  }
});
test('Search finds CLI commands and GitHub repositories without case sensitivity', () => {
  assert.deepEqual(filterTools(tools, { query: 'CLI/CLI' }).map(tool => tool.slug), ['github-cli', 'salesforce-cli']);
  assert.deepEqual(filterTools(tools, { query: 'wrangler' }).map(tool => tool.slug), ['wrangler']);
  assert.ok(filterTools(tools, { query: 'JSON' }).some(tool => tool.slug === 'jq'));
});
test('Task search, category, and saved filters intersect', () => {
  assert.deepEqual(filterTools(tools, { category: 'Code search', query: 'JSON', onlySaved: true, saved: ['ripgrep', 'jq'] }).map(tool => tool.slug), ['ripgrep']);
  assert.equal(filterTools(tools, { category: 'Browser automation', query: 'Docker' }).length, 0);
});
test('Star ranking uses numeric totals and does not mutate the catalog', () => {
  const before = tools.map(tool => tool.slug);
  const result = filterTools(tools, { sort: 'stars' });
  assert.equal(result[0].stars, Math.max(...tools.map(tool => tool.stars)));
  assert.deepEqual(tools.map(tool => tool.slug), before);
});
test('Empty searches and missing bookmarks produce truthful empty states', () => {
  assert.equal(filterTools(tools, { query: 'nonexistentproduct' }).length, 0);
  assert.equal(filterTools(tools, { onlySaved: true, saved: [] }).length, 0);
});
test('A single star snapshot has no invented growth', () => {
  const result = starWindow([{ date: '2026-09-09', stars: 24710 }]);
  assert.equal(result.change, null);
  assert.equal(result.percentage, null);
});
test('Star history handles decreases, elapsed days, and window cutoff', () => {
  const result = starWindow([{ date: '2026-01-01', stars: 500 }, { date: '2026-08-10', stars: 100 }, { date: '2026-09-09', stars: 90 }]);
  assert.equal(result.change, -10);
  assert.equal(result.percentage, -10);
  assert.equal(result.elapsedDays, 30);
  assert.equal(result.points.length, 2);
});
test('Star history does not divide by zero or interpolate missing days', () => {
  const result = starWindow([{ date: '2026-09-01', stars: 0 }, { date: '2026-09-09', stars: 15 }]);
  assert.equal(result.percentage, null);
  assert.equal(result.points.length, 2);
  assert.equal(result.elapsedDays, 8);
});
test('Every CLI has an entry point, example, source, metadata, and local logo', async () => {
  assert.equal(new Set(catalog.map(tool => tool.slug)).size, catalog.length);
  for (const tool of tools) {
    assert.ok(categories.includes(tool.category), `${tool.name} has a filterable category`);
    assert.ok(tool.command?.trim());
    assert.ok(tool.example?.includes(tool.command.split(' ')[0]));
    assert.ok(tool.useCase && tool.agentUse);
    assert.match(tool.docs, /^https:\/\//);
    assert.ok(!('alternative' in tool));
    assert.ok(Number.isFinite(tool.stars));
    assert.ok(!Number.isNaN(Date.parse(tool.checkedAt)));
    assert.equal(tool.source, `https://github.com/${tool.repo}`);
    assert.ok((await readFile(new URL(`../public/logos/${tool.slug}.png`, import.meta.url))).byteLength > 100);
  }
});
