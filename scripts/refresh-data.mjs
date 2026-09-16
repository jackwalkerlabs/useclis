import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { replaceFile } from './lib/atomic-file.mjs';
import { readWithRetry } from './lib/retry-read.mjs';
import { repositoryIdentity } from './lib/repository-identity.mjs';
import { selectRefreshEntries } from './lib/refresh-selection.mjs';
const catalog = selectRefreshEntries(JSON.parse(await readFile(new URL('../src/data/catalog.json', import.meta.url))));
const out = new URL('../src/data/repositories.json', import.meta.url);
let previous = {};
try { previous = JSON.parse(await readFile(out)); } catch {}
const data = { ...previous };
await mkdir(new URL('../public/logos/', import.meta.url), { recursive: true });
for (const tool of catalog) {
  const attemptedAt = new Date().toISOString();
  try {
    const repo = await readWithRetry(`https://api.github.com/repos/${tool.repo}`, { headers: { Accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) } });
    const identity = repositoryIdentity(repo, tool.repo, previous[tool.slug]);
    if (!Number.isSafeInteger(repo.stargazers_count) || repo.stargazers_count < 0) throw new Error('Invalid star count');
    let lastCommitAt = previous[tool.slug]?.lastCommitAt;
    const unchangedPush = Number.isFinite(Date.parse(repo.pushed_at)) && previous[tool.slug]?.pushedAt === repo.pushed_at
      && typeof repo.default_branch === 'string' && previous[tool.slug]?.defaultBranch === repo.default_branch
      && previous[tool.slug]?.source === identity.source && previous[tool.slug]?.repositoryId === repo.id && lastCommitAt !== undefined;
    if (!unchangedPush) {
      const commits = await readWithRetry(`https://api.github.com/repositories/${repo.id}/commits?per_page=1`, { headers: { Accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) } });
      if (!Array.isArray(commits)) throw new Error('Invalid commit response');
      lastCommitAt = commits[0]?.commit?.committer?.date ?? null;
    }
    const next = { defaultBranch: repo.default_branch, createdAt: repo.created_at, pushedAt: repo.pushed_at, lastCommitAt, stars: repo.stargazers_count, license: repo.license?.spdx_id === 'NOASSERTION' ? null : repo.license?.spdx_id ?? null, language: repo.language, checkedAt: new Date().toISOString(), ...identity, attemptedAt, status: 'ok' };
    data[tool.slug] = next;
    const logoPath = new URL(`../public/logos/${tool.slug}.png`, import.meta.url);
    try {
      const logoUrl = new URL(repo.owner.avatar_url);
      logoUrl.searchParams.set('s', '96');
      const logo = await readWithRetry(logoUrl, {}, response => response.arrayBuffer());
      await replaceFile(logoPath, Buffer.from(logo));
    } catch (error) {
      // An optional image refresh must not discard successfully checked metrics.
      console.warn(`${tool.name}: logo refresh failed (${error.message}); retaining any saved image.`);
      try { await access(logoPath); }
      catch { console.error(`${tool.name}: required local logo is missing.`); process.exitCode = 1; }
    }
    console.log(`${tool.name}: ${data[tool.slug].stars} stars, ${data[tool.slug].license ?? 'See repository license'}`);
  } catch (error) {
    if (previous[tool.slug]) data[tool.slug] = { ...previous[tool.slug], attemptedAt, status: 'error' };
    console.error(`${tool.name}: ${error.message}. Keeping existing metadata.`);
    process.exitCode = 1;
  }
}
await writeFile(out, JSON.stringify(data, null, 2) + '\n');
