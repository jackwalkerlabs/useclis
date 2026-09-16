import { readFile, appendFile } from 'node:fs/promises';
import { refreshRunHealth } from './lib/refresh-monitor.mjs';
import { snapshotFreshness } from '../src/lib/freshness.mjs';
const problems = [];
if (process.argv[2]) {
  const runs = JSON.parse(await readFile(process.argv[2], 'utf8'));
  problems.push(...refreshRunHealth(runs.workflow_runs));
}
const catalog = JSON.parse(await readFile(new URL('../src/data/catalog.json', import.meta.url)));
for (const [file, provider] of [['repositories', 'github'], ['activity', 'github'], ['homebrew', 'homebrew']]) {
  const data = JSON.parse(await readFile(new URL(`../src/data/${file}.json`, import.meta.url)));
  const slugs = file === 'homebrew' ? Object.keys(JSON.parse(await readFile(new URL('../src/data/homebrew-mappings.json', import.meta.url)))) : catalog.map(tool => tool.slug);
  for (const slug of slugs) {
    const state = snapshotFreshness(data[slug], provider);
    if (!['fresh', 'pending'].includes(state)) problems.push(`${file}/${slug}: ${state}`);
  }
}
const downloads = JSON.parse(await readFile(new URL('../src/data/downloads.json', import.meta.url)));
const downloadMappings = JSON.parse(await readFile(new URL('../src/data/download-mappings.json', import.meta.url)));
for (const [slug, mapping] of Object.entries(downloadMappings)) {
  if (!mapping.github) continue;
  const state = snapshotFreshness(downloads[slug]?.github, 'github');
  if (state !== 'fresh') problems.push(`downloads/${slug}/github: ${state}`);
}
const report = `## Directory freshness\n\n${problems.length ? problems.map(problem => `- ${problem}`).join('\n') : 'Daily refresh and provider snapshots are within the documented windows.'}\n`;
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, report);
if (problems.length) { console.error('::error::Directory freshness needs attention; see the job summary.'); process.exitCode = 1; }
