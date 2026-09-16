/** A shared, finite primary-quota wait budget for one daily collection process. */
export function createGithubFetch({ fetcher = fetch, now = Date.now, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), maxWaitMs = 185 * 60_000, notice = console.log } = {}) {
  let remaining = null;
  let reset = null;
  let waited = 0;
  let exhausted = false;
  async function waitForReset() {
    if (reset === null || reset <= now()) return false;
    const delay = reset - now() + 1000;
    if (!Number.isFinite(delay) || delay <= 0 || delay > 61 * 60_000) return false;
    if (waited + delay > maxWaitMs) { exhausted = true; throw new Error('GitHub primary quota wait budget exhausted'); }
    notice(`::notice::GitHub primary quota exhausted; waiting ${Math.ceil(delay / 60_000)} minutes for reset (${Math.ceil((maxWaitMs - waited) / 60_000)} minutes total wait budget left).`);
    let pending = delay;
    while (pending > 0) {
      const chunk = Math.min(pending, 30_000);
      await sleep(chunk);
      waited += chunk;
      pending -= chunk;
      if (pending > 0) notice(`GitHub quota reset: ${Math.ceil(pending / 60_000)} minutes remaining.`);
    }
    remaining = null;
    return true;
  }
  return async (url, options = {}) => {
    if (new URL(url).hostname !== 'api.github.com' || !new Headers(options.headers).has('authorization')) return fetcher(url, options);
    if (exhausted) throw new Error('GitHub primary quota wait budget exhausted');
    if (remaining === 0) await waitForReset();
    for (let attempt = 0; attempt < 2; attempt++) {
      // Collection callers use timeout signals. A quota wait must not reuse an
      // already-expired request timeout; each actual attempt has a fresh bound.
      const response = await fetcher(url, { ...options, signal: AbortSignal.timeout(25_000) });
      const value = response.headers.get('x-ratelimit-remaining');
      const timestamp = response.headers.get('x-ratelimit-reset');
      remaining = value !== null && /^\d+$/.test(value) ? Number(value) : null;
      reset = timestamp !== null && /^\d+$/.test(timestamp) ? Number(timestamp) * 1000 : null;
      if (attempt === 0 && [403, 429].includes(response.status) && remaining === 0) {
        if (await waitForReset()) { await response.body?.cancel(); continue; }
      }
      // Auth errors and secondary limits are not blindly retried.
      return response;
    }
  };
}
