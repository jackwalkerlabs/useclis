import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ownerStats, ownerKey, profileHref, websiteHref } from '../src/lib/profiles.ts';
import { tools } from '../src/data/tools.ts';
import { profiles } from '../src/data/profiles.ts';

test('Every catalog owner has a sourced profile, correct listings, and local avatar', async () => {
  assert.equal(profiles.length, new Set(tools.map(tool => ownerKey(tool.repo))).size);
  for (const profile of profiles) {
    assert.equal(profile.source.toLowerCase(), `https://github.com/${profile.key}`);
    assert.ok(['User', 'Organization'].includes(profile.type));
    assert.ok(Number.isFinite(profile.followers));
    assert.ok(Number.isFinite(Date.parse(profile.checkedAt)));
    assert.deepEqual(new Set(profile.listings.map(tool => tool.slug)), new Set(tools.filter(tool => ownerKey(tool.repo) === profile.key).map(tool => tool.slug)));
    assert.ok((await readFile(new URL(`../public${profile.avatar}`, import.meta.url))).byteLength > 100);
  }
  assert.equal(profileHref('BurntSushi/ripgrep'), '/github/burntsushi/');
});

test('Owner totals deduplicate shared repositories and align weeks from stale snapshots', () => {
  const listings = [{ slug: 'one', repo: 'Owner/shared', stars: 100 }, { slug: 'alias', repo: 'owner/SHARED', stars: 100 }, { slug: 'two', repo: 'owner/other', stars: 20 }];
  const stats = ownerStats(listings, {
    alias: { checkedAt: '2026-09-09T20:00:00Z', weeks: [1, 2, 3] },
    two: { checkedAt: '2026-09-02T20:00:00Z', weeks: [10, 20, 30] },
  });
  assert.equal(stats.stars, 120);
  assert.equal(stats.repositories, 2);
  assert.deepEqual(stats.points, [{ date: '2026-08-23', commits: 21 }, { date: '2026-08-30', commits: 32 }]);
  assert.equal(stats.commits12, 53);
});

test('Missing activity stays unavailable, while measured zero remains zero', () => {
  const listing = [{ slug: 'one', repo: 'owner/one', stars: 20 }];
  assert.equal(ownerStats(listing, {}).commits12, null);
  assert.equal(ownerStats(listing, {}).activityRepositories, 0);
  const stats = ownerStats(listing, { one: { checkedAt: '2026-09-09', weeks: [0, 0] } });
  assert.equal(stats.commits12, 0);
  assert.equal(stats.activityRepositories, 1);
});

test('Profile website links only allow HTTP and HTTPS', () => {
  assert.equal(websiteHref('example.com'), 'https://example.com/');
  assert.equal(websiteHref('https://example.com/path'), 'https://example.com/path');
  assert.equal(websiteHref('javascript:alert(1)'), null);
  assert.equal(websiteHref('data:text/html,test'), null);
  assert.equal(websiteHref(null), null);
});
