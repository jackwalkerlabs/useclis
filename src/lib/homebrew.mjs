/** @typedef {{ formula: string, repo: string, upstreamUrls?: string[] }} HomebrewMapping */
/** @typedef {'30d' | '90d' | '365d'} HomebrewPeriod */
/** @typedef {{ formula: string, repo: string, source: string, checkedAt: string | null, attemptedAt: string, generatedDate: string | null, status: 'ok' | 'error', counts: Record<HomebrewPeriod, number | null> }} HomebrewSnapshot */

export const homebrewPeriods = /** @type {const} */ (['30d', '90d', '365d']);

/** Compare an upstream URL at a path boundary, never by fuzzy package name. */
export function matchesUpstream(value, expected) {
  try {
    const actual = new URL(value);
    const target = new URL(expected);
    const path = actual.pathname.toLowerCase().replace(/\/$/, '').replace(/\.git$/, '');
    const base = target.pathname.toLowerCase().replace(/\/$/, '').replace(/\.git$/, '');
    return ['http:', 'https:'].includes(actual.protocol) && actual.hostname === target.hostname && (path === base || path.startsWith(`${base}/`));
  } catch { return false; }
}

/** @param {unknown} values */
export function sumInstallRequests(values) {
  if (values == null) return null;
  if (typeof values !== 'object' || Array.isArray(values)) throw new Error('Invalid installation counts');
  const counts = Object.values(values);
  if (!counts.length) return null;
  if (counts.some(value => !Number.isSafeInteger(value) || value < 0)) throw new Error('Invalid installation count');
  const sum = counts.reduce((a, b) => a + b, 0);
  if (!Number.isSafeInteger(sum)) throw new Error('Installation count overflow');
  return sum;
}

/**
 * A source failure keeps the last good observation, including its original timestamp.
 * Missing analytics are unavailable, even when metadata fetch succeeds.
 * @param {HomebrewMapping} mapping
 * @param {HomebrewSnapshot | undefined} previous
 * @param {typeof fetch} fetcher
 * @param {string} now
 * @returns {Promise<{snapshot: HomebrewSnapshot, error: string | null}>}
 */
export async function refreshHomebrewEntry(mapping, previous, fetcher = fetch, now = new Date().toISOString()) {
  const source = `https://formulae.brew.sh/api/formula/${mapping.formula}.json`;
  const base = { formula: mapping.formula, repo: mapping.repo, source, attemptedAt: now };
  try {
    const response = await fetcher(source, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`Homebrew returned HTTP ${response.status}`);
    const data = await response.json();
    const identities = [`https://github.com/${mapping.repo}`, ...(mapping.upstreamUrls ?? [])];
    const upstream = [data.homepage, data.urls?.stable?.url, data.urls?.head?.url];
    if (data.name !== mapping.formula || data.tap !== 'homebrew/core' || !upstream.some(url => identities.some(target => matchesUpstream(url, target)))) throw new Error('Homebrew package identity changed');
    const analytics = data.analytics?.install_on_request;
    if (analytics != null && (typeof analytics !== 'object' || Array.isArray(analytics))) throw new Error('Invalid installation analytics');
    const counts = /** @type {Record<HomebrewPeriod, number | null>} */ (Object.fromEntries(homebrewPeriods.map(period => [period, sumInstallRequests(analytics?.[period])])));
    const generatedDate = data.generated_date ?? null;
    if (generatedDate !== null && (typeof generatedDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(generatedDate) || !Number.isFinite(Date.parse(generatedDate)))) throw new Error('Invalid source generation date');
    return { snapshot: { ...base, counts, checkedAt: now, generatedDate, status: 'ok' }, error: null };
  } catch (error) {
    const saved = previous?.formula === mapping.formula && previous?.repo === mapping.repo ? previous : null;
    return { snapshot: { ...base, counts: saved?.counts ?? { '30d': null, '90d': null, '365d': null }, checkedAt: saved?.checkedAt ?? null, generatedDate: saved?.generatedDate ?? null, status: 'error' }, error: error instanceof Error ? error.message : 'Homebrew request failed' };
  }
}
