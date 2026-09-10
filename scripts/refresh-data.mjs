import { readFile, writeFile, mkdir } from 'node:fs/promises';
const catalog = JSON.parse(await readFile(new URL('../src/data/catalog.json', import.meta.url)));
const out = new URL('../src/data/repositories.json', import.meta.url);
let previous = {};
try { previous = JSON.parse(await readFile(out)); } catch {}
const data = { ...previous };
await mkdir(new URL('../public/logos/', import.meta.url), { recursive: true });
for (const tool of catalog) {
  try {
    const response = await fetch(`https://api.github.com/repos/${tool.repo}`, { signal: AbortSignal.timeout(15_000), headers: { Accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) } });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    const repo = await response.json();
    const commitResponse = await fetch(`https://api.github.com/repos/${tool.repo}/commits?per_page=1`, { signal: AbortSignal.timeout(15_000), headers: { Accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) } });
    if (!commitResponse.ok) throw new Error(`Commit API returned ${commitResponse.status}`);
    const commits = await commitResponse.json();
    const next = { createdAt: repo.created_at, pushedAt: repo.pushed_at, lastCommitAt: commits[0]?.commit?.committer?.date ?? null, stars: repo.stargazers_count, license: repo.license?.spdx_id === 'NOASSERTION' ? null : repo.license?.spdx_id ?? null, language: repo.language, checkedAt: new Date().toISOString(), source: repo.html_url };
    const logoUrl = new URL(repo.owner.avatar_url);
    logoUrl.searchParams.set('s', '96');
    const logo = await fetch(logoUrl, { signal: AbortSignal.timeout(15_000) });
    if (!logo.ok) throw new Error(`Avatar returned ${logo.status}`);
    await writeFile(new URL(`../public/logos/${tool.slug}.png`, import.meta.url), Buffer.from(await logo.arrayBuffer()));
    data[tool.slug] = next;
    console.log(`${tool.name}: ${data[tool.slug].stars} stars, ${data[tool.slug].license ?? 'See repository license'}`);
  } catch (error) {
    console.error(`${tool.name}: ${error.message}. Keeping existing metadata.`);
    process.exitCode = 1;
  }
}
await writeFile(out, JSON.stringify(data, null, 2) + '\n');
