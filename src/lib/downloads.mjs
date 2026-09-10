import { matchesUpstream } from './homebrew.mjs';

export const downloadSources = /** @type {const} */ (['npm', 'pypi', 'github']);
export const downloadLabels = { npm: 'npm downloads', pypi: 'PyPI downloads', github: 'GitHub binary downloads' };
const DAY = 86400000;
const emptyCounts = () => ({ '30d': null, '90d': null, '365d': null });
export const normalizePythonName = name => name.toLowerCase().replace(/[-_.]+/g, '-');
const day = value => new Date(value).toISOString().slice(0, 10);
function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && day(value) === value;
}
function count(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid download count');
  return value;
}
const total = values => count(values.reduce((a, b) => a + count(b), 0));

/** Require every day in a window; gaps and short histories are unavailable, never zero-filled. */
export function periodCounts(daily, end) {
  return Object.fromEntries([30, 90, 365].map(length => {
    const values = Array.from({ length }, (_, i) => daily[day(Date.parse(end) - i * DAY)]);
    return [`${length}d`, values.some(value => value == null) ? null : total(values)];
  }));
}

export function mappingIdentity(source, mapping) {
  return JSON.stringify([source, mapping.repo.toLowerCase(), mapping[source]]);
}

/** Validate explicit mappings before any requests or writes. */
export function validateDownloadMappings(catalog, mappings) {
  const seen = new Set();
  for (const [slug, mapping] of Object.entries(mappings)) {
    if (catalog.find(tool => tool.slug === slug)?.repo !== mapping.repo) throw new Error(`Invalid download repository: ${slug}`);
    for (const source of downloadSources.filter(source => mapping[source])) {
      const config = mapping[source];
      const key = `${source}:${source === 'github' ? mapping.repo.toLowerCase() : source === 'pypi' ? normalizePythonName(config.package) : config.package}`;
      if (seen.has(key)) throw new Error(`Duplicate download mapping: ${key}`);
      seen.add(key);
      if (source === 'github') {
        if (!config.assetPattern?.startsWith('^') || !config.assetPattern.endsWith('$')) throw new Error(`Unanchored asset pattern: ${slug}`);
        new RegExp(config.assetPattern);
        if (!matchesUpstream(config.evidence, `https://github.com/${mapping.repo}`)) throw new Error(`Invalid asset evidence: ${slug}`);
      } else if (typeof config.package !== 'string' || !(source === 'npm' ? /^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/ : /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/).test(config.package)) {
        throw new Error(`Invalid package: ${slug}`);
      }
    }
  }
}

/** Exact registry-to-repository verification on every refresh. */
export function verifyPackage(source, mapping, data) {
  const name = mapping[source].package;
  const upstream = `https://github.com/${mapping.repo}`;
  if (source === 'npm') {
    const repo = typeof data.repository === 'string' ? data.repository : data.repository?.url;
    const url = typeof repo === 'string' ? repo.replace(/^git\+/, '').replace(/^git:\/\//, 'https://') : '';
    if (data.name !== name || !matchesUpstream(url, upstream) || !data.bin || !Object.keys(data.bin).length) throw new Error('npm package identity or executable declaration changed');
  } else {
    const info = data.info;
    if (!info || normalizePythonName(info.name) !== normalizePythonName(name) || ![info.home_page, ...Object.values(info.project_urls ?? {})].some(url => matchesUpstream(url, upstream))) throw new Error('PyPI package identity changed');
  }
}

/** @typedef {{ identity: string, repo: string, package: string | null, source: string, url: string, status: string, checkedAt: string | null, attemptedAt: string, end: string | null, counts: Record<string, number | null>, total: number | null, assetCount?: number, releaseCount?: number }} DownloadSnapshot */

/** @returns {Promise<{snapshot: DownloadSnapshot, history: any, error: string | null}>} */
export async function refreshDownloadEntry(source, mapping, previous, history, fetcher = fetch, now = new Date().toISOString(), token = '') {
  const identity = mappingIdentity(source, mapping);
  const saved = previous?.identity === identity ? previous : null;
  const retained = history?.identity === identity ? history : null;
  const name = mapping[source].package;
  const url = source === 'npm' ? `https://www.npmjs.com/package/${name}` : source === 'pypi' ? `https://pypi.org/project/${name}/` : `https://github.com/${mapping.repo}/releases`;
  const base = { identity, repo: mapping.repo, package: name ?? null, source, url, attemptedAt: now };
  const request = async url => {
    const response = await fetcher(url, { signal: AbortSignal.timeout(25000), headers: { 'User-Agent': 'useclis-download-statistics (https://useclis.com/about/)', ...(new URL(url).hostname === 'api.github.com' ? { Accept: 'application/vnd.github+json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } : {}) } });
    if (!response.ok) throw new Error(`${source} returned HTTP ${response.status}`);
    return { data: await response.json(), next: /<[^>]+>;\s*rel="next"/.test(response.headers.get('link') ?? '') };
  };
  try {
    if (source === 'github') {
      const pattern = new RegExp(mapping.github.assetPattern);
      const assets = {};
      let releaseCount = 0;
      let finished = false;
      for (let page = 1; page <= 100; page++) {
        const { data: releases, next } = await request(`https://api.github.com/repos/${mapping.repo}/releases?per_page=100&page=${page}`);
        if (!Array.isArray(releases)) throw new Error('Invalid releases response');
        for (const release of releases) {
          if (release.draft || release.prerelease) continue;
          if (!matchesUpstream(release.html_url, `https://github.com/${mapping.repo}/releases`) || !Array.isArray(release.assets)) throw new Error('Release identity changed');
          // Embedded assets may be truncated. Fetch their paginated endpoint at the boundary.
          let listed = release.assets;
          if (listed.length >= 100) {
            listed = [];
            let complete = false;
            for (let assetPage = 1; assetPage <= 100; assetPage++) {
              const { data, next } = await request(`https://api.github.com/repos/${mapping.repo}/releases/${release.id}/assets?per_page=100&page=${assetPage}`);
              if (!Array.isArray(data)) throw new Error('Invalid assets response');
              listed.push(...data);
              if (!next && data.length < 100) { complete = true; break; }
            }
            if (!complete) throw new Error('Asset pagination limit reached');
          }
          let matched = false;
          for (const asset of listed) {
            if (!pattern.test(asset.name) || /(?:checksum|sha256|sha512|signature|\.sig$|\.asc$|\.pem$|\.sbom\.)/i.test(asset.name)) continue;
            if (!Number.isSafeInteger(asset.id) || assets[asset.id] != null || !matchesUpstream(asset.browser_download_url, `https://github.com/${mapping.repo}/releases/download`)) throw new Error('Invalid or duplicate release asset');
            assets[asset.id] = count(asset.download_count);
            matched = true;
          }
          if (matched) releaseCount++;
        }
        if (!next && releases.length < 100) { finished = true; break; }
      }
      if (!finished) throw new Error('Release pagination limit reached');
      if (!Object.keys(assets).length) throw new Error('No matching binary release assets');
      const downloads = total(Object.values(assets));
      const observations = { ...(retained?.observations ?? {}), [day(now)]: downloads };
      for (const date of Object.keys(observations)) if (Date.parse(date) < Date.parse(day(now)) - 400 * DAY) delete observations[date];
      return { snapshot: { ...base, status: 'ok', checkedAt: now, end: day(now), counts: emptyCounts(), total: downloads, assetCount: Object.keys(assets).length, releaseCount }, history: { identity, observations }, error: null };
    }
    const metadata = await request(source === 'npm' ? `https://registry.npmjs.org/${encodeURIComponent(name)}/latest` : `https://pypi.org/pypi/${encodeURIComponent(name)}/json`);
    verifyPackage(source, mapping, metadata.data);
    const endpoint = source === 'npm' ? `https://api.npmjs.org/downloads/range/last-year/${encodeURIComponent(name)}` : `https://pypistats.org/api/packages/${encodeURIComponent(name)}/overall?mirrors=false`;
    const { data } = await request(endpoint);
    if ((source === 'npm' ? data.package !== name : normalizePythonName(data.package ?? '') !== normalizePythonName(name))) throw new Error('Download response package changed');
    const rows = source === 'npm' ? data.downloads : data.data;
    if (!Array.isArray(rows) || (source === 'pypi' && data.type !== 'overall_downloads')) throw new Error('Invalid download response');
    const incoming = {};
    for (const row of rows) {
      if (source === 'pypi' && row.category !== 'without_mirrors') continue;
      const date = source === 'npm' ? row.day : row.date;
      if (!validDate(date) || incoming[date] != null || date >= day(now)) throw new Error('Invalid or duplicate download date');
      incoming[date] = count(row.downloads);
    }
    const dates = Object.keys(incoming).sort();
    const end = dates.at(-1);
    if (!end || Date.parse(day(now)) - Date.parse(end) > 7 * DAY) throw new Error('Download source is empty or stale');
    if (source === 'npm' && (data.end !== end || data.start !== dates[0])) throw new Error('Download date range changed');
    // Replace the returned interval, including gaps; never mask a new gap with old data.
    const daily = { ...(retained?.daily ?? {}) };
    for (const date of Object.keys(daily)) if (date >= dates[0] || Date.parse(date) < Date.parse(end) - 399 * DAY) delete daily[date];
    Object.assign(daily, incoming);
    return { snapshot: { ...base, status: 'ok', checkedAt: now, end, counts: periodCounts(daily, end), total: null }, history: { identity, daily }, error: null };
  } catch (error) {
    return { snapshot: { ...base, status: 'error', checkedAt: saved?.checkedAt ?? null, end: saved?.end ?? null, counts: saved?.counts ?? emptyCounts(), total: saved?.total ?? null, ...(saved?.assetCount != null ? { assetCount: saved.assetCount, releaseCount: saved.releaseCount } : {}) }, history: retained, error: error instanceof Error ? error.message : 'Download refresh failed' };
  }
}
