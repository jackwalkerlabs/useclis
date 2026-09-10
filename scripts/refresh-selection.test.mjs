import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { selectRefreshEntries } from './lib/refresh-selection.mjs';

test('Refresh selection distinguishes daily, empty, and malformed input', () => {
  const entries = [{ slug: 'old' }, { slug: 'new' }];
  assert.deepEqual(selectRefreshEntries(entries), entries);
  assert.deepEqual(selectRefreshEntries(entries, '[]'), []);
  assert.deepEqual(selectRefreshEntries(entries, '["new"]'), [entries[1]]);
  for (const value of ['', 'null', '{}', '["new","new"]', '["../old"]', '[1]']) {
    assert.throws(() => selectRefreshEntries(entries, value));
  }
});

test('Real refresh pipeline selects new entries and preserves all existing snapshots and images; daily refresh still covers both', async () => {
  const root = await mkdtemp(join(tmpdir(), 'useclis-refresh-selection-'));
  const scripts = ['refresh-data', 'refresh-activity', 'snapshot-stars', 'refresh-homebrew', 'refresh-profiles'];
  const stores = ['repositories', 'activity', 'star-snapshots', 'homebrew', 'profiles'];
  const previous = { stars: 10, checkedAt: '2026-09-01T00:00:00Z', marker: 'existing snapshot' };
  try {
    for (const dir of ['scripts/lib', 'src/data', 'src/lib', 'public/logos', 'public/avatars', 'artifacts']) await mkdir(join(root, dir), { recursive: true });
    for (const script of scripts) await copyFile(new URL(`./${script}.mjs`, import.meta.url), join(root, `scripts/${script}.mjs`));
    await copyFile(new URL('./refresh-additions.mjs', import.meta.url), join(root, 'scripts/refresh-additions.mjs'));
    await copyFile(new URL('./lib/refresh-selection.mjs', import.meta.url), join(root, 'scripts/lib/refresh-selection.mjs'));
    await copyFile(new URL('../src/lib/homebrew.mjs', import.meta.url), join(root, 'src/lib/homebrew.mjs'));
    const catalog = ['old', 'new'].map(slug => ({ slug, name: slug, repo: `${slug}/cli` }));
    await writeFile(join(root, 'src/data/catalog.json'), JSON.stringify(catalog));
    await writeFile(join(root, 'artifacts/discovery-report.json'), JSON.stringify({ accepted: [catalog[1]] }));
    await writeFile(join(root, 'package.json'), JSON.stringify({ type: 'module', scripts: { refresh: 'node runner.mjs' } }));
    await writeFile(join(root, 'src/data/homebrew-mappings.json'), JSON.stringify(Object.fromEntries(catalog.map(tool => [tool.slug, { formula: tool.slug, repo: tool.repo }]))));
    for (const store of stores) await writeFile(join(root, `src/data/${store}.json`), JSON.stringify({ old: store === 'star-snapshots' ? [{ date: '2026-08-31', stars: 5 }] : previous }));
    for (const dir of ['logos', 'avatars']) await writeFile(join(root, `public/${dir}/old.png`), 'existing image');
    const code = `
      const calls = [];
      globalThis.fetch = async url => {
        url = String(url); calls.push(url);
        const owner = url.includes('/old') ? 'old' : 'new';
        if (url.includes('avatars.example')) return new Response('new image');
        if (url.includes('/formula/')) return Response.json({ name: owner, tap: 'homebrew/core', homepage: 'https://github.com/' + owner + '/cli', generated_date: '2026-09-10', analytics: { install_on_request: { '30d': { [owner]: 123 } } } });
        if (url.includes('/users/')) return Response.json({ login: owner, type: 'User', followers: 1, avatar_url: 'https://avatars.example/' + owner + '?v=1' });
        if (url.includes('/stats/participation')) return Response.json({ all: Array(52).fill(5) });
        if (url.includes('/commits?')) return Response.json([{ commit: { committer: { date: '2026-09-10T00:00:00Z' } } }]);
        return Response.json({ stargazers_count: 99, html_url: 'https://github.com/' + owner + '/cli', owner: { avatar_url: 'https://avatars.example/' + owner } });
      };
      for (const script of ${JSON.stringify(scripts)}) await import(${JSON.stringify(pathToFileURL(join(root, 'scripts/')).href)} + script + '.mjs');
      await (await import('node:fs/promises')).writeFile(${JSON.stringify(join(root, 'calls.json'))}, JSON.stringify(calls));
    `;
    const run = promisify(execFile);
    const env = { ...process.env, GITHUB_TOKEN: '' };
    delete env.REFRESH_SLUGS;
    await writeFile(join(root, 'runner.mjs'), code);
    await run(process.execPath, [join(root, 'scripts/refresh-additions.mjs')], { env, timeout: 10000 });
    const calls = JSON.parse(await readFile(join(root, 'calls.json')));
    assert.equal(calls.length, 7, 'Only one repository, commit, activity, owner, formula, and two images fetched');
    assert.ok(calls.every(url => !url.includes('/old')));
    for (const store of stores) {
      const data = JSON.parse(await readFile(join(root, `src/data/${store}.json`)));
      assert.deepEqual(data.old, store === 'star-snapshots' ? [{ date: '2026-08-31', stars: 5 }] : previous, store);
      assert.ok(data.new, `${store} includes new entry`);
    }
    for (const dir of ['logos', 'avatars']) assert.equal(await readFile(join(root, `public/${dir}/old.png`), 'utf8'), 'existing image');
    await run(process.execPath, ['--input-type=module', '--eval', code], { env, timeout: 10000 });
    assert.equal(JSON.parse(await readFile(join(root, 'calls.json'))).length, 14, 'Daily refresh still fetches both entries');
  } finally { await rm(root, { recursive: true, force: true }); }
});
