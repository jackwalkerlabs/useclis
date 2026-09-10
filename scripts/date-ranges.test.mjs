import test from 'node:test';
import assert from 'node:assert/strict';
import { rangeStart, activityWindow } from '../src/lib/date-ranges.ts';

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
