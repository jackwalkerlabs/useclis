import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesUpstream, sumInstallRequests, refreshHomebrewEntry } from '../src/lib/homebrew.mjs';
import { tools } from '../src/data/tools.ts';

const mapping = { formula: 'gh', repo: 'cli/cli' };
const now = '2026-09-10T01:00:00.000Z';
const payload = () => ({
  name: 'gh', tap: 'homebrew/core', generated_date: '2026-09-09',
  urls: { stable: { url: 'https://github.com/cli/cli/archive/refs/tags/v2.0.tar.gz' } },
  analytics: { install: { '30d': { gh: 99999 } }, install_on_request: { '30d': { gh: 100, 'gh --HEAD': 2 }, '90d': { gh: 300 }, '365d': { gh: 1000 } } },
});
const response = data => async () => new Response(JSON.stringify(data));

test('Homebrew identities require a matching host and whole repository path', () => {
  const target = 'https://github.com/cli/cli';
  assert.ok(matchesUpstream('https://github.com/CLI/cli.git', target));
  assert.ok(matchesUpstream('https://github.com/cli/cli/releases/tag/v2', target));
  for (const url of ['https://github.com/cli/cli-other', 'https://github.com/ClickHouse/ClickHouse', 'https://github.com.evil.test/cli/cli', 'https://example.com/?repo=github.com/cli/cli', 'javascript:alert(1)']) assert.equal(matchesUpstream(url, target), false, url);
});

test('Install requests exclude dependency-only totals and combine HEAD variants', async () => {
  const { snapshot, error } = await refreshHomebrewEntry(mapping, undefined, response(payload()), now);
  assert.equal(error, null);
  assert.deepEqual(snapshot.counts, { '30d': 102, '90d': 300, '365d': 1000 });
  assert.equal(snapshot.checkedAt, now);
  assert.equal(snapshot.generatedDate, '2026-09-09');
});

test('Zero is a measured value; absent periods and empty reports are unavailable', async () => {
  assert.equal(sumInstallRequests({ gh: 0 }), 0);
  for (const value of [undefined, null, {}]) assert.equal(sumInstallRequests(value), null);
  const data = payload();
  data.analytics.install_on_request = { '30d': { gh: 0 }, '90d': {} };
  const { snapshot } = await refreshHomebrewEntry(mapping, undefined, response(data), now);
  assert.deepEqual(snapshot.counts, { '30d': 0, '90d': null, '365d': null });
});

test('HTTP, network, malformed data, and identity failures retain the original observation', async () => {
  const { snapshot: previous } = await refreshHomebrewEntry(mapping, undefined, response(payload()), now);
  const badCount = payload(); badCount.analytics.install_on_request['30d'].gh = -5;
  const changedRepo = payload(); changedRepo.urls.stable.url = 'https://github.com/other/cli/archive/v1.tar.gz';
  const wrongPackage = payload(); wrongPackage.name = 'gh-other';
  const wrongShape = payload(); wrongShape.analytics.install_on_request = [];
  for (const fetcher of [async () => new Response('', { status: 429 }), async () => { throw new Error('timeout'); }, response(badCount), response(changedRepo), response(wrongPackage), response(wrongShape), async () => new Response('{')]) {
    const { snapshot, error } = await refreshHomebrewEntry(mapping, previous, fetcher, '2026-09-11T01:00:00.000Z');
    assert.ok(error);
    assert.equal(snapshot.status, 'error');
    assert.deepEqual(snapshot.counts, previous.counts);
    assert.equal(snapshot.checkedAt, previous.checkedAt);
    assert.equal(snapshot.generatedDate, previous.generatedDate);
    assert.notEqual(snapshot.attemptedAt, snapshot.checkedAt);
  }
});

test('First failures and changed mappings never borrow unrelated saved counts', async () => {
  const { snapshot: previous } = await refreshHomebrewEntry(mapping, undefined, response(payload()), now);
  for (const saved of [undefined, { ...previous, repo: 'different/repo' }, { ...previous, formula: 'different' }]) {
    const { snapshot } = await refreshHomebrewEntry(mapping, saved, async () => new Response('', { status: 503 }), now);
    assert.deepEqual(snapshot.counts, { '30d': null, '90d': null, '365d': null });
    assert.equal(snapshot.checkedAt, null);
  }
});

test('A successful retry clears the failure state and advances the observation', async () => {
  const { snapshot: failed } = await refreshHomebrewEntry(mapping, undefined, async () => new Response('', { status: 503 }), now);
  const { snapshot } = await refreshHomebrewEntry(mapping, failed, response(payload()), '2026-09-11T01:00:00.000Z');
  assert.equal(snapshot.status, 'ok');
  assert.equal(snapshot.checkedAt, '2026-09-11T01:00:00.000Z');
  assert.equal(snapshot.counts['30d'], 102);
});

test('Catalog snapshots stay attached to their verified formula and repository', () => {
  assert.ok(tools.some(tool => tool.homebrew));
  assert.ok(tools.some(tool => !tool.homebrewFormula));
  for (const tool of tools) {
    if (!tool.homebrewFormula) { assert.equal(tool.homebrew, null); continue; }
    const snapshot = tool.homebrew;
    assert.ok(snapshot, tool.name);
    assert.equal(snapshot.repo, tool.repo);
    assert.equal(snapshot.formula, tool.homebrewFormula);
    assert.equal(snapshot.source, `https://formulae.brew.sh/api/formula/${tool.homebrewFormula}.json`);
    for (const value of Object.values(snapshot.counts)) assert.ok(value === null || (Number.isSafeInteger(value) && value >= 0));
  }
});
