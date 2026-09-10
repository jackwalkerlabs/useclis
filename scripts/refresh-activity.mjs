import { readFile, writeFile } from 'node:fs/promises';
const catalog = JSON.parse(await readFile(new URL('../src/data/catalog.json', import.meta.url)));
const path = new URL('../src/data/activity.json', import.meta.url);
let data = {};
try { data = JSON.parse(await readFile(path)); } catch {}
for (const tool of catalog) {
  const source = `https://api.github.com/repos/${tool.repo}/stats/participation`;
  try {
    const response = await fetch(source, { headers: { Accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) } });
    if (response.status !== 200) { console.log(`${tool.name}: ${response.status}, preserving existing history`); continue; }
    const result = await response.json();
    if (!Array.isArray(result.all) || result.all.length !== 52 || !result.all.every(value => Number.isFinite(value) && value >= 0)) throw new Error('Invalid weekly series');
    data[tool.slug] = { weeks: result.all, checkedAt: new Date().toISOString(), source };
    console.log(`${tool.name}: 52 weeks of commit activity`);
  } catch (error) { console.error(`${tool.name}: ${error.message}`); }
}
await writeFile(path, JSON.stringify(data, null, 2) + '\n');
