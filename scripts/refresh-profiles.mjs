import { readFile, writeFile, mkdir } from 'node:fs/promises';

const catalog = JSON.parse(await readFile(new URL('../src/data/catalog.json', import.meta.url)));
const path = new URL('../src/data/profiles.json', import.meta.url);
let profiles = {};
try { profiles = JSON.parse(await readFile(path)); } catch {}
await mkdir(new URL('../public/avatars/', import.meta.url), { recursive: true });
const owners = [...new Set(catalog.map(tool => tool.repo.split('/')[0].toLowerCase()))];
for (const owner of owners) {
  if (process.argv.includes('--missing') && profiles[owner]) continue;
  try {
    const response = await fetch(`https://api.github.com/users/${owner}`, {
      headers: { Accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    const profile = await response.json();
    if (!['User', 'Organization'].includes(profile.type) || !Number.isFinite(profile.followers)) throw new Error('Invalid profile');
    const avatar = await fetch(`${profile.avatar_url}&s=192`, { signal: AbortSignal.timeout(20000) });
    if (!avatar.ok) throw new Error(`Avatar returned ${avatar.status}`);
    await writeFile(new URL(`../public/avatars/${owner}.png`, import.meta.url), Buffer.from(await avatar.arrayBuffer()));
    profiles[owner] = {
      login: profile.login, name: profile.name || profile.login, type: profile.type,
      bio: profile.bio, location: profile.location, website: profile.blog || null,
      followers: profile.followers, publicRepos: profile.public_repos,
      createdAt: profile.created_at, checkedAt: new Date().toISOString(), source: profile.html_url,
    };
    console.log(`${profile.login}: ${profile.type}`);
  } catch (error) {
    console.error(`${owner}: ${error.message}. Keeping existing profile.`);
    process.exitCode = 1;
  }
}
await writeFile(path, JSON.stringify(profiles, null, 2) + '\n');
