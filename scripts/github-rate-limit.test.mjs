import test from 'node:test';
import assert from 'node:assert/strict';
import { createGithubFetch } from './lib/github-rate-limit.mjs';
const url = 'https://api.github.com/repos/example/cli';
const options = { headers: { Authorization: 'Bearer test-fixture' }, signal: AbortSignal.abort() };
const limited = (reset = 60) => new Response('{}', { status: 403, headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(reset) } });
test('Primary quota exhaustion waits in bounded chunks, renews timeouts, and retries once', async () => {
  let now = 0; let calls = 0; const pauses = []; const notices = [];
  const request = createGithubFetch({ now: () => now, sleep: async ms => { pauses.push(ms); now += ms; }, notice: message => notices.push(message), fetcher: async (_, opts) => {
    assert.equal(opts.signal.aborted, false);
    return ++calls === 1 ? limited() : Response.json({ ok: true });
  } });
  assert.equal((await request(url, options)).status, 200);
  assert.equal(calls, 2);
  assert.equal(now, 61000);
  assert.ok(pauses.every(ms => ms <= 30000));
  assert.match(notices[0], /primary quota exhausted/);
});
test('Success with no remaining quota delays the next request and shares one finite wait budget', async () => {
  let now = 0; let calls = 0;
  const request = createGithubFetch({ now: () => now, maxWaitMs: 61000, sleep: async ms => { now += ms; }, notice: () => {}, fetcher: async () => {
    calls++;
    return new Response('{}', { headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': calls === 1 ? '60' : '120' } });
  } });
  await request(url, options); await request(url, options);
  await assert.rejects(request(url, options), /wait budget exhausted/);
  await assert.rejects(request(url, options), /wait budget exhausted/);
  assert.equal(calls, 2);
});
test('Authentication, secondary limits and invalid reset headers do not sleep or retry', async () => {
  for (const response of [new Response('', { status: 401 }), new Response('', { status: 403, headers: { 'x-ratelimit-remaining': '20', 'retry-after': '60' } }), limited(99999999), limited(-1)]) {
    let calls = 0;
    const request = createGithubFetch({ now: () => 0, sleep: () => { throw new Error('Unexpected wait'); }, fetcher: async () => { calls++; return response; } });
    assert.equal(await request(url, options), response);
    assert.equal(calls, 1);
  }
});
test('Non-GitHub requests and unauthenticated calls are passed through untouched', async () => {
  const request = createGithubFetch({ fetcher: async (_, opts) => { assert.equal(opts, options); return limited(); } });
  assert.equal((await request('https://formulae.brew.sh/api/formula/gh.json', options)).status, 403);
  const unauthenticated = { signal: options.signal };
  const withoutToken = createGithubFetch({ fetcher: async (_, opts) => { assert.equal(opts, unauthenticated); return limited(); } });
  assert.equal((await withoutToken(url, unauthenticated)).status, 403);
});
