import { readFile, writeFile } from 'node:fs/promises';
const repoPath = new URL('../src/data/repositories.json', import.meta.url);
const path = new URL('../src/data/star-snapshots.json', import.meta.url);
const repositories = JSON.parse(await readFile(repoPath));
let history = {};
try { history = JSON.parse(await readFile(path)); } catch {}
for (const [slug, repo] of Object.entries(repositories)) {
  if (!Number.isFinite(repo.stars) || !repo.checkedAt) continue;
  const date = repo.checkedAt.slice(0, 10);
  const points = (history[slug] ?? []).filter(point => point.date !== date);
  points.push({ date, stars: repo.stars });
  history[slug] = points.sort((a, b) => a.date.localeCompare(b.date)).slice(-400);
}
await writeFile(path, JSON.stringify(history, null, 2) + '\n');
console.log(`Recorded daily GitHub star totals for ${Object.keys(repositories).length} repositories.`);
