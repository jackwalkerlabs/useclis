import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const catalog = JSON.parse(await readFile(new URL('dist/clis.json', root), 'utf8'));
let commit = process.env.GITHUB_SHA || null;
if (!commit) {
  try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { /* Source archives can still build; CI always supplies GITHUB_SHA. */ }
}
if (commit !== null && !/^[a-f0-9]{40}$/.test(commit)) throw new Error('Invalid built commit identity');
await writeFile(new URL('dist/build-info.json', root), JSON.stringify({ commit, catalogCount: catalog.tools.length }) + '\n');
