import { readFile, writeFile } from 'node:fs/promises';
import { refreshWithDeferredRetries } from './lib/deferred-activity.mjs';
import { selectRefreshEntries } from './lib/refresh-selection.mjs';
const catalog = selectRefreshEntries(JSON.parse(await readFile(new URL('../src/data/catalog.json', import.meta.url))));
const path = new URL('../src/data/activity.json', import.meta.url);
const repositories = JSON.parse(await readFile(new URL('../src/data/repositories.json', import.meta.url)));
let data = {};
try { data = JSON.parse(await readFile(path)); } catch {}
await refreshWithDeferredRetries(catalog, async tool => {
  const source = `https://api.github.com/repos/${tool.repo}/stats/participation`;
  const metadata = repositories[tool.slug];
  const canonicalSource = metadata?.source === `https://github.com/${tool.repo}` && Number.isSafeInteger(metadata.repositoryId) && metadata.repositoryId > 0
    ? `https://api.github.com/repositories/${metadata.repositoryId}/stats/participation` : null;
  const attemptedAt = new Date().toISOString();
  try {
    if (!canonicalSource) throw new Error('A validated numeric repository identity is required before refreshing activity');
    const response = await fetch(canonicalSource, { signal: AbortSignal.timeout(15_000), headers: { Accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) } });
    // GitHub returns 202 while calculating statistics for a repository.
    if (response.status === 202) {
      if (data[tool.slug]) data[tool.slug] = { ...data[tool.slug], attemptedAt, status: 'pending' };
      console.log(`${tool.name}: statistics pending, preserving existing history`); return true;
    }
    if (response.status !== 200) throw new Error(`GitHub returned ${response.status}`);
    const result = await response.json();
    if (!Array.isArray(result.all) || result.all.length !== 52 || !result.all.every(value => Number.isFinite(value) && value >= 0)) throw new Error('Invalid weekly series');
    data[tool.slug] = { weeks: result.all, checkedAt: new Date().toISOString(), source, canonicalSource, attemptedAt, status: 'ok' };
    console.log(`${tool.name}: 52 weeks of commit activity`);
  } catch (error) {
    if (data[tool.slug]) data[tool.slug] = { ...data[tool.slug], attemptedAt, status: 'error' };
    console.error(`${tool.name}: ${error.message}. Keeping existing history.`); process.exitCode = 1; }
});
await writeFile(path, JSON.stringify(data, null, 2) + '\n');
