import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const report = JSON.parse(await readFile(new URL('artifacts/discovery-report.json', root)));
const catalog = JSON.parse(await readFile(new URL('src/data/catalog.json', root)));
if (!Array.isArray(report.accepted) || report.accepted.some(entry => !catalog.some(tool => tool.slug === entry.slug && tool.repo === entry.repo))) {
  throw new Error('Discovery additions do not match the current catalog');
}
const slugs = report.accepted.map(entry => entry.slug);
if (slugs.length) {
  const result = spawnSync('npm', ['run', 'refresh'], {
    cwd: root, stdio: 'inherit', env: { ...process.env, REFRESH_SLUGS: JSON.stringify(slugs) },
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} else {
  console.log('No additions to refresh.');
}
