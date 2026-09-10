import { readFile, writeFile, rename } from 'node:fs/promises';
import { downloadSources, mappingIdentity, refreshDownloadEntry, validateDownloadMappings } from '../src/lib/downloads.mjs';

const read = async name => JSON.parse(await readFile(new URL(`../src/data/${name}.json`, import.meta.url)));
const optional = async name => { try { return await read(name); } catch (error) { if (error.code !== 'ENOENT') throw error; return {}; } };
const catalog = await read('catalog');
const mappings = await read('download-mappings');
validateDownloadMappings(catalog, mappings);
const previous = await optional('downloads');
const histories = await optional('download-history');
const snapshots = {};
const history = {};
const now = new Date().toISOString();
let failures = 0;
let refreshed = 0;
let cached = 0;
// Sequential requests keep provider load modest. Do not repeatedly query daily data.
for (const [slug, mapping] of Object.entries(mappings)) {
  snapshots[slug] = {};
  history[slug] = {};
  for (const source of downloadSources.filter(source => mapping[source])) {
    const saved = previous[slug]?.[source];
    const retained = histories[slug]?.[source];
    if (saved?.identity === mappingIdentity(source, mapping) && saved.attemptedAt?.slice(0, 10) === now.slice(0, 10)) {
      snapshots[slug][source] = saved;
      history[slug][source] = retained ?? null;
      cached++;
      continue;
    }
    const result = await refreshDownloadEntry(source, mapping, saved, retained, fetch, now, process.env.GITHUB_TOKEN);
    snapshots[slug][source] = result.snapshot;
    history[slug][source] = result.history;
    if (result.error) { failures++; console.warn(`${slug}/${source}: ${result.error}; retaining any saved observation.`); }
    else { refreshed++; console.log(`${slug}/${source}: refreshed`); }
  }
}
for (const [name, value] of [['download-history', history], ['downloads', snapshots]]) {
  const path = new URL(`../src/data/${name}.json`, import.meta.url);
  const temporary = new URL(`../src/data/${name}.json.tmp`, import.meta.url);
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporary, path);
}
console.log(`Downloads: ${refreshed} refreshed, ${cached} cached today, ${failures} unavailable.`);
