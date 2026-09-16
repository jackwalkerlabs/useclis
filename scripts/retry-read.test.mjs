import test from 'node:test';
import assert from 'node:assert/strict';
import { createReadWithRetry } from './lib/retry-read.mjs';
test('Read retries timeout and body interruption with fresh signals and stops on success', async () => {
  const signals = []; const pauses = [];
  const read = createReadWithRetry({ pause: async ms => pauses.push(ms), notice: () => {}, fetcher: async (_, options) => {
    signals.push(options.signal);
    if (signals.length === 1) throw new DOMException('timed out', 'TimeoutError');
    if (signals.length === 2) return { ok: true, json: async () => { throw new DOMException('body timed out', 'TimeoutError'); } };
    return Response.json({ stars: 10 });
  } });
  assert.deepEqual(await read('https://api.github.com/repos/example/cli'), {stars: 10});
  assert.equal(new Set(signals).size, 3); assert.deepEqual(pauses, [1000, 3000]);
});
test('Transient HTTP failures share a finite budget; permanent responses and invalid JSON are not retried', async () => {
  let calls = 0;
  const read = createReadWithRetry({ retryBudget: 2, pause: async () => {}, notice: () => {}, fetcher: async () => { calls++; return new Response('', {status: 503}); } });
  await assert.rejects(read('https://example.com'), /503/);
  await assert.rejects(read('https://example.com'), /503/);
  assert.equal(calls, 4);
  for (const status of [401, 403, 404, 429, 200]) {
    let count = 0;
    const once = createReadWithRetry({ fetcher: async () => { count++; return new Response('invalid json', {status}); } });
    await assert.rejects(once('https://example.com')); assert.equal(count, 1);
  }
});
