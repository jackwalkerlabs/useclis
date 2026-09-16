import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { snapshotFreshness } from '../src/lib/freshness.mjs';
import SnapshotFreshness from '../src/components/SnapshotFreshness.tsx';
import { repositoryIdentity } from './lib/repository-identity.mjs';
import { refreshRunHealth } from './lib/refresh-monitor.mjs';
import repositories from '../src/data/repositories.json' with { type: 'json' };
import homebrew from '../src/data/homebrew.json' with { type: 'json' };
const now = Date.parse('2026-09-15T12:00:00Z');
const checkedAt = '2026-09-14T00:00:00Z';
test('Snapshot freshness has deterministic inclusive boundaries and failed, pending, unknown states', () => {
  assert.equal(snapshotFreshness({ checkedAt }, 'github', now), 'fresh');
  assert.equal(snapshotFreshness({ checkedAt }, 'github', now + 1), 'stale');
  assert.equal(snapshotFreshness({ checkedAt, status: 'error' }, 'github', now), 'failed');
  assert.equal(snapshotFreshness({ checkedAt, status: 'pending' }, 'github', now), 'pending');
  assert.equal(snapshotFreshness({ checkedAt, status: 'pending' }, 'github', now + 1), 'stale');
  for (const checkedAt of [null, 'invalid', '2026-09-16T00:00:00Z']) assert.equal(snapshotFreshness({ checkedAt }, 'github', now), 'unavailable');
  assert.equal(snapshotFreshness({ checkedAt, generatedDate: '2026-09-12' }, 'homebrew', now), 'stale');
  assert.equal(snapshotFreshness({ checkedAt, generatedDate: '2026-09-13' }, 'homebrew', now), 'fresh');
  assert.equal(snapshotFreshness({ checkedAt }, 'homebrew', now), 'stale');
});
test('Real dbt identity redirect preserves joins and rejects replaced repositories', () => {
  const api = { id: 53548867, full_name: 'dbt-labs/dbt', html_url: 'https://github.com/dbt-labs/dbt' };
  const identity = repositoryIdentity(api, 'dbt-labs/dbt-core');
  assert.equal(identity.source, 'https://github.com/dbt-labs/dbt-core');
  assert.equal(identity.canonicalSource, api.html_url);
  assert.deepEqual(repositoryIdentity(api, 'dbt-labs/dbt-core', identity), identity);
  assert.throws(() => repositoryIdentity({ ...api, id: 123 }, 'dbt-labs/dbt-core', identity), /identity changed/);
  assert.throws(() => repositoryIdentity({ ...api, html_url: 'https://github.com/other/repo' }, 'dbt-labs/dbt-core'), /Invalid/);
});
test('Real OpenCode and Homebrew fixtures render dated stale and failed states without changing last-good values', () => {
  for (const [label, snapshot, provider] of [['OpenCode', repositories.opencode, 'github'], ['Homebrew', homebrew['github-cli'], 'homebrew']]) {
    assert.ok(snapshot, label);
    const before = JSON.stringify(snapshot);
    for (const status of ['ok', 'error']) {
      const html = renderToStaticMarkup(createElement(SnapshotFreshness, { label, snapshot: { ...snapshot, status }, provider, renderedAt: Date.parse(snapshot.checkedAt) + 37 * 3600000 }));
      assert.match(html, status === 'error' ? /Refresh failed/ : /Stale data/);
      assert.match(html, /Last successful check/);
      assert.ok(html.includes(snapshot.checkedAt));
    }
    assert.equal(JSON.stringify(snapshot), before);
  }
  assert.match(renderToStaticMarkup(createElement(SnapshotFreshness, { label: 'GitHub', snapshot: { checkedAt }, renderedAt: now })), /Within freshness window/);
});
test('Monitor detects failed, cancelled, never-successful and overdue jobs without accepting other branches', () => {
  const success = { id: 1, head_branch: 'main', event: 'schedule', status: 'completed', conclusion: 'success', created_at: checkedAt };
  assert.deepEqual(refreshRunHealth([success], now), []);
  assert.equal(refreshRunHealth([success], now + 1).length, 1);
  assert.equal(refreshRunHealth([], now).length, 1);
  assert.equal(refreshRunHealth([{ ...success, head_branch: 'feature' }], now).length, 1);
  for (const conclusion of ['failure', 'cancelled']) assert.equal(refreshRunHealth([success, { ...success, id: 2, created_at: '2026-09-15T06:17:00Z', conclusion }], now).length, 1);
  assert.deepEqual(refreshRunHealth([success, { ...success, id: 2, created_at: '2026-09-15T06:17:00Z', status: 'in_progress', conclusion: null }], now), []);
});
