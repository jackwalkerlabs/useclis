import test from 'node:test';
import assert from 'node:assert/strict';
import { refreshWithDeferredRetries } from './lib/deferred-activity.mjs';
test('Deferred sweeps retry only pending tools at most twice and leave exhaustion pending', async () => {
  const calls = []; const pauses = []; const counts = {};
  await refreshWithDeferredRetries(['fresh', 'slow', 'pending', 'failed'], async name => {
    calls.push(name); counts[name] = (counts[name] ?? 0) + 1;
    return name === 'pending' || (name === 'slow' && counts[name] === 1);
  }, { pause: async ms => pauses.push(ms), notice: () => {} });
  assert.deepEqual(calls, ['fresh', 'slow', 'pending', 'failed', 'slow', 'pending', 'pending']);
  assert.deepEqual(pauses, [30000, 30000]);
});
