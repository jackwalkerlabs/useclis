import { readFile, writeFile, rename } from 'node:fs/promises';
import { selectRefreshEntries } from './lib/refresh-selection.mjs';
import { refreshHomebrewEntry } from '../src/lib/homebrew.mjs';

const catalog = JSON.parse(await readFile(new URL('../src/data/catalog.json', import.meta.url)));
const mappings = JSON.parse(await readFile(new URL('../src/data/homebrew-mappings.json', import.meta.url)));
const out = new URL('../src/data/homebrew.json', import.meta.url);
let previous = {};
try { previous = JSON.parse(await readFile(out)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const entries = Object.entries(mappings);
const seen = new Set();
for (const [slug, mapping] of entries) {
  if (!/^[a-z0-9][a-z0-9+_.@-]*$/.test(mapping.formula) || seen.has(mapping.formula) || catalog.find(tool => tool.slug === slug)?.repo !== mapping.repo) throw new Error(`Invalid or duplicate Homebrew mapping: ${slug}`);
  seen.add(mapping.formula);
}
const selected = selectRefreshEntries(entries, process.env.REFRESH_SLUGS, ([slug]) => slug);
const data = { ...previous };
let failures = 0;
for (let start = 0; start < selected.length; start += 4) {
  const results = await Promise.allSettled(selected.slice(start, start + 4).map(async ([slug, mapping]) => {
    const { snapshot, error } = await refreshHomebrewEntry(mapping, previous[slug]);
    data[slug] = snapshot;
    if (error) { failures++; console.warn(`${slug}: ${error}; retaining any previous observation.`); }
  }));
  for (const result of results) if (result.status === 'rejected') throw result.reason;
}
const ordered = Object.fromEntries(entries.map(([slug]) => [slug, data[slug]]));
const temporary = new URL('./homebrew.json.tmp', out);
await writeFile(temporary, `${JSON.stringify(ordered, null, 2)}\n`);
await rename(temporary, out);
// Provider failures are represented in snapshots so other successful data can still publish.
console.log(`Homebrew: ${selected.length - failures}/${selected.length} packages refreshed; ${failures} unavailable.`);
