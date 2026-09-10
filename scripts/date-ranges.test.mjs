import test from 'node:test';
import assert from 'node:assert/strict';
import { rangeStart, activityWindow } from '../src/lib/date-ranges.ts';
import { tools } from '../src/data/tools.ts';
import activity from '../src/data/activity.json' with { type: 'json' };

test('Month ranges clamp leap days and month ends using UTC', () => {
  assert.equal(new Date(rangeStart('3m', '2026-05-31T23:59:00Z')).toISOString(), '2026-02-28T00:00:00.000Z');
  assert.equal(new Date(rangeStart('12m', '2024-02-29')).toISOString(), '2023-02-28T00:00:00.000Z');
  assert.equal(new Date(rangeStart('7d', '2026-03-10')).toISOString(), '2026-03-03T00:00:00.000Z');
  assert.equal(rangeStart('all', '2026-09-09'), -Infinity);
});

test('Activity retains overlapping weekly buckets and never invents unavailable history', () => {
  const weeks = Array.from({ length: 52 }, (_, i) => i + 1);
  assert.deepEqual(activityWindow(weeks, '7d', '2026-09-09'), [
    { date: '2026-08-30', value: 51 }, { date: '2026-09-06', value: 52 },
  ]);
  assert.equal(activityWindow(weeks, '7d', '2026-09-13').length, 2);
  assert.deepEqual(activityWindow([9], 'all', '2026-09-09'), [{ date: '2026-09-06', value: 9 }]);
  assert.deepEqual(activityWindow([], '30d', '2026-09-09'), []);
});

test('Every CLI has valid activity data and correct values and totals for every range', () => {
  // Fixed snapshot anchor preserves the exhaustive chart test's expected bucket
  // counts. Exercise dropdown wiring separately on representative series.
  for (const tool of tools) {
    const snapshot = activity[tool.slug];
    assert.ok(snapshot, `${tool.slug} has activity data`);
    assert.ok(Number.isFinite(Date.parse(snapshot.checkedAt)), tool.slug);
    assert.equal(snapshot.source, `https://api.github.com/repos/${tool.repo}/stats/participation`);
    assert.equal(snapshot.weeks.length, 52, tool.slug);
    assert.ok(snapshot.weeks.every(value => Number.isSafeInteger(value) && value >= 0), tool.slug);
    for (const [period, count] of [['7d', 2], ['30d', 5], ['3m', 14], ['6m', 27], ['12m', 52], ['all', 52]]) {
      const expected = snapshot.weeks.slice(-count);
      const actual = activityWindow(snapshot.weeks, period, '2026-09-09').map(point => point.value);
      assert.deepEqual(actual, expected, `${tool.slug} ${period}`);
      assert.equal(actual.reduce((sum, value) => sum + value, 0), expected.reduce((sum, value) => sum + value, 0), `${tool.slug} ${period} total`);
    }
  }
});
