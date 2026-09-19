import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTools, repositoryQuery, searchMatch } from '../src/lib/filter.mjs';
import { tools } from '../src/data/tools.ts';

const pick = slugs => slugs.map(slug => {
  const tool = tools.find(tool => tool.slug === slug);
  assert.ok(tool, `${slug} exists in the catalog`);
  return tool;
});
const slugs = (items, options) => filterTools(items, options).map(tool => tool.slug);
const searchTools = pick(['ripgrep', 'fd', 'ast-grep', 'scc', 'github-cli', 'jq', 'salesforce-cli']);

test('Repository URLs and owner/repo roots resolve exactly, including clone suffixes and fragments', () => {
  for (const query of ['cli/cli', 'CLI/CLI/', 'https://github.com/cli/cli', 'http://github.com/cli/cli/',
    'github.com/cli/cli', 'https://www.github.com/CLI/CLI.git/?tab=readme#readme', ' cli/cli.git#readme ']) {
    assert.equal(repositoryQuery(query), 'cli/cli', query);
    assert.deepEqual(slugs(searchTools, { query }), ['github-cli'], query);
  }
  for (const query of ['https://example.com/cli/cli', 'https://github.com.evil.test/cli/cli',
    'https://user@github.com/cli/cli', 'https://github.com:8443/cli/cli', 'https://github.com/cli/cli/issues/1',
    'https://github.com/cli', 'https://github.com/cli/%63li', 'https://github.com/cli/../cli', 'unknown/missing']) {
    assert.deepEqual(slugs(searchTools, { query }), [], query);
  }
});

test('Exact command, name and repository identities precede incidental field mentions', () => {
  const exact = searchTools[0];
  for (const query of ['rg', 'ripgrep', 'BurntSushi/ripgrep']) {
    const incidental = { ...exact, name: 'Popular companion', slug: 'incidental', repo: 'example/companion',
      command: 'companion', sourceListName: null, useCase: `Help with ${query}`, stars: 9999999 };
    assert.equal(slugs([incidental, exact], { query })[0], 'ripgrep');
    assert.equal(slugs([incidental, exact], { query, sort: 'stars' })[0], query.includes('/') ? 'ripgrep' : 'incidental');
  }
  assert.deepEqual(slugs(searchTools, { query: 'RG' }), ['ripgrep']);
  for (const word of ['large', 'Argo', 'rgr', 'target', 'rg_extra']) {
    const noisy = { name: word, description: word, command: word, repo: `example/${word}` };
    assert.equal(searchMatch(noisy, 'rg'), null, word);
  }
});

test('Task searches require catalog evidence in one field and omit category-only or split-field matches', () => {
  assert.deepEqual(slugs(searchTools, { query: 'search code' }), ['ripgrep', 'ast-grep']);
  assert.deepEqual(slugs(searchTools, { query: 'find files' }), ['fd']);
  assert.ok(slugs(searchTools, { query: 'json' }).includes('jq'));
  const split = { name: 'Unrelated', category: 'Code search', description: 'Search files', agentUse: 'Count code' };
  assert.equal(searchMatch(split, 'search code'), null);
  assert.equal(searchMatch(split, 'code search').reason, 'Category: Code search');
  assert.equal(searchMatch(searchTools[0], 'search code').reason, `Task: ${searchTools[0].useCase}`);
  for (const query of ['quantum banana toaster', 'rg nonexistent', '.*', '[', 'search xyzzy', 'zzzzzzz']) {
    assert.deepEqual(slugs(searchTools, { query }), [], query);
  }
});

test('Search composes category/bookmarks and preserves explicit sorts and unknown metrics', () => {
  assert.deepEqual(slugs(searchTools, { query: 'https://github.com/cli/cli', category: 'Code search' }), []);
  assert.deepEqual(slugs(searchTools, { query: 'search code', onlySaved: true, saved: ['ast-grep'] }), ['ast-grep']);
  const samples = [
    { name: 'Unknown', command: 'sample', stars: 500, weeklyCommits: null },
    { name: 'Zero', command: 'sample', stars: 0, weeklyCommits: 0, homebrew: { counts: { '30d': 0 } } },
  ];
  for (const sort of ['active', 'homebrew']) assert.equal(filterTools(samples, { query: 'sample', sort })[0].name, 'Zero');
  assert.equal(filterTools(samples, { query: 'sample', sort: 'stars' })[0].name, 'Unknown');
  const ranked = [
    { name: 'Missing', command: 'sample' },
    { name: 'Low', command: 'sample', stars: 5, homebrew: { counts: { '30d': 5 } }, downloads: { npm: { counts: { '30d': 5 } }, github: { total: 5 } } },
    { name: 'Zero', command: 'sample', stars: 0, homebrew: { counts: { '30d': 0 } }, downloads: { npm: { counts: { '30d': 0 } }, github: { total: 0 } } },
    { name: 'High', command: 'sample', stars: 50, homebrew: { counts: { '30d': null } }, downloads: { npm: { counts: { '30d': 50 } }, github: { total: 50 } } },
  ];
  const order = (sort, direction) => filterTools(ranked, { sort, direction }).map(tool => tool.name);
  assert.deepEqual(order('stars', 'asc'), ['Zero', 'Low', 'High', 'Missing']);
  assert.deepEqual(order('stars', 'desc'), ['High', 'Low', 'Zero', 'Missing']);
  for (const sort of ['npm', 'github']) {
    assert.deepEqual(order(sort, 'asc'), ['Zero', 'Low', 'High', 'Missing'], sort);
    assert.deepEqual(order(sort, 'desc'), ['High', 'Low', 'Zero', 'Missing'], sort);
  }
  // Unavailable Homebrew counts (null or unmapped) stay last, alphabetically, in both directions.
  assert.deepEqual(order('homebrew', 'asc'), ['Zero', 'Low', 'High', 'Missing']);
  assert.deepEqual(order('homebrew', 'desc'), ['Low', 'Zero', 'High', 'Missing']);
  assert.deepEqual(order('pypi', 'asc'), order('pypi', 'desc'));
  assert.deepEqual(order('name', 'asc'), order('name', 'desc'));
  const before = [...searchTools];
  filterTools(searchTools, { query: 'search code' });
  assert.deepEqual(searchTools, before);
});

test('Every current catalog identity and canonical GitHub URL remains searchable as the catalog grows', () => {
  for (const tool of tools) {
    for (const query of [tool.name, tool.command, tool.repo, `https://github.com/${tool.repo}`]) {
      assert.ok(filterTools(tools, { query }).some(match => match.slug === tool.slug), `${tool.slug}: ${query}`);
    }
  }
});
