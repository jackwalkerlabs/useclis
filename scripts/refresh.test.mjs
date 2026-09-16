import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
// Execute the real refresh scripts against a temporary catalog and mocked HTTP.
async function scenario(script, fetchBody, repository = {}) {
  const root = await mkdtemp(join(tmpdir(), 'useclis-refresh-'));
  const previous = { example: { stars: 10, checkedAt: '2026-09-01T00:00:00Z', weeks: Array(52).fill(3), source: 'https://github.com/example/cli', repositoryId: 100, ...repository } };
  try {
    await mkdir(join(root, 'scripts/lib'), { recursive: true });
    await copyFile(new URL('./lib/refresh-selection.mjs', import.meta.url), join(root, 'scripts/lib/refresh-selection.mjs'));
    await copyFile(new URL('./lib/deferred-activity.mjs', import.meta.url), join(root, 'scripts/lib/deferred-activity.mjs'));
    await copyFile(new URL('./lib/repository-identity.mjs', import.meta.url), join(root, 'scripts/lib/repository-identity.mjs'));
    await mkdir(join(root, 'src/data'), { recursive: true });
    await copyFile(new URL(`./${script}.mjs`, import.meta.url), join(root, 'scripts', `${script}.mjs`));
    await writeFile(join(root, 'src/data/catalog.json'), JSON.stringify([{ slug: 'example', name: 'Example', repo: 'example/cli' }]));
    for (const file of ['activity', 'repositories']) await writeFile(join(root, `src/data/${file}.json`), JSON.stringify(previous));
    const code = `const realSetTimeout = setTimeout; globalThis.setTimeout = fn => realSetTimeout(fn, 0); globalThis.fetch = async (url, options) => {
      if (!(options?.signal instanceof AbortSignal)) throw new Error('Request is missing its timeout signal');
      ${fetchBody}
    }; await import(${JSON.stringify(pathToFileURL(join(root, 'scripts', `${script}.mjs`)).href)});`;
    let exitCode = 0;
    try { await run(process.execPath, ['--input-type=module', '--eval', code], { timeout: 10_000, env: { ...process.env, GITHUB_TOKEN: '', REFRESH_SLUGS: '["example"]' } }); }
    catch (error) { exitCode = error.code; }
    const output = JSON.parse(await readFile(join(root, `src/data/${script === 'refresh-activity' ? 'activity' : 'repositories'}.json`)));
    return { exitCode, output, previous };
  } finally { await rm(root, { recursive: true, force: true }); }
}

test('Pending GitHub statistics preserve prior history without failing the refresh', async () => {
  const { exitCode, output, previous } = await scenario('refresh-activity', 'return new Response(null, { status: 202 });');
  assert.equal(exitCode, 0);
  assert.deepEqual(output.example.weeks, previous.example.weeks);
  assert.equal(output.example.checkedAt, previous.example.checkedAt);
  assert.ok(output.example.attemptedAt);
});

test('Rate limits, invalid activity, and network failures preserve history and fail the refresh', async () => {
  for (const response of [
    'return new Response(null, { status: 403 });',
    'return Response.json({ all: [1, 2, 3] });',
    'throw new Error("Connection failed");',
  ]) {
    const { exitCode, output, previous } = await scenario('refresh-activity', response);
    assert.equal(exitCode, 1);
    assert.deepEqual(output.example.weeks, previous.example.weeks);
    assert.equal(output.example.checkedAt, previous.example.checkedAt);
    assert.equal(output.example.status, 'error');
  }
});

test('Successful activity refresh records the GitHub source and complete weekly series', async () => {
  const { exitCode, output } = await scenario('refresh-activity', 'return Response.json({ all: Array(52).fill(5) });');
  assert.equal(exitCode, 0);
  assert.deepEqual(output.example.weeks, Array(52).fill(5));
  assert.equal(output.example.source, 'https://api.github.com/repos/example/cli/stats/participation');
});

test('Avatar failure does not partially replace repository metadata', async () => {
  const { exitCode, output, previous } = await scenario('refresh-data', `
    if (String(url).includes('/commits?')) return Response.json([{ commit: { committer: { date: '2026-09-09T00:00:00Z' } } }]);
    if (String(url).includes('avatars.example')) return new Response(null, { status: 500 });
    return Response.json({ id: 100, full_name: 'example/cli', stargazers_count: 99, html_url: 'https://github.com/example/cli', owner: { avatar_url: 'https://avatars.example/user' } });
  `);
  assert.equal(exitCode, 1);
  assert.equal(output.example.stars, previous.example.stars);
  assert.equal(output.example.checkedAt, previous.example.checkedAt);
  assert.equal(output.example.status, 'error');
});

test('Repository refresh builds a valid avatar URL and commits complete metadata', async () => {
  const { exitCode, output } = await scenario('refresh-data', `
    if (String(url).includes('/commits?')) return Response.json([{ commit: { committer: { date: '2026-09-09T00:00:00Z' } } }]);
    if (String(url).includes('avatars.example')) {
      if (new URL(url).searchParams.get('s') !== '96') throw new Error('Missing avatar size parameter');
      return new Response('image bytes');
    }
    return Response.json({ id: 100, full_name: 'example/cli', stargazers_count: 99, license: { spdx_id: 'MIT' }, html_url: 'https://github.com/example/cli', owner: { avatar_url: 'https://avatars.example/user' } });
  `);
  assert.equal(exitCode, 0);
  assert.equal(output.example.stars, 99);
  assert.equal(output.example.license, 'MIT');
});


test('Canonical GitHub rename succeeds while preserving catalog source provenance', async () => {
  const { exitCode, output } = await scenario('refresh-data', `
    if (String(url).includes('/commits?')) return Response.json([]);
    if (String(url).includes('avatars.example')) return new Response('image bytes');
    return Response.json({ id: 53548867, full_name: 'dbt-labs/dbt', stargazers_count: 99, html_url: 'https://github.com/dbt-labs/dbt', owner: { avatar_url: 'https://avatars.example/user' } });
  `, { repositoryId: undefined });
  assert.equal(exitCode, 0);
  assert.equal(output.example.source, 'https://github.com/example/cli');
  assert.equal(output.example.canonicalSource, 'https://github.com/dbt-labs/dbt');
  assert.equal(output.example.repositoryId, 53548867);
  assert.equal(output.example.status, 'ok');
});


test('Pinned activity uses repository ID rather than a possibly reused old name', async () => {
  const { exitCode, output } = await scenario('refresh-activity', `
    if (String(url) !== 'https://api.github.com/repositories/53548867/stats/participation') throw new Error('Wrong repository');
    return Response.json({ all: Array(52).fill(5) });
  `, { source: 'https://github.com/example/cli', repositoryId: 53548867 });
  assert.equal(exitCode, 0);
  assert.equal(output.example.source, 'https://api.github.com/repos/example/cli/stats/participation');
  assert.equal(output.example.canonicalSource, 'https://api.github.com/repositories/53548867/stats/participation');
});

test('Reused repository names preserve last-good metadata and ID with a failed attempt', async () => {
  const { exitCode, output } = await scenario('refresh-data', `
    return Response.json({ id: 999, full_name: 'example/cli', html_url: 'https://github.com/example/cli' });
  `, { repositoryId: 53548867 });
  assert.equal(exitCode, 1);
  assert.equal(output.example.repositoryId, 53548867);
  assert.equal(output.example.stars, 10);
  assert.equal(output.example.checkedAt, '2026-09-01T00:00:00Z');
  assert.equal(output.example.status, 'error');
});

test('An unchanged pushed_at reuses the last commit observation while freshly checking metadata', async () => {
  const pushedAt = '2026-09-09T00:00:00Z';
  const { exitCode, output } = await scenario('refresh-data', `
    if (String(url).includes('/commits?')) throw new Error('Unnecessary commit request');
    if (String(url).includes('avatars.example')) return new Response('image bytes');
    return Response.json({ id: 100, full_name: 'example/cli', pushed_at: '${pushedAt}', stargazers_count: 99, html_url: 'https://github.com/example/cli', owner: { avatar_url: 'https://avatars.example/user' } });
  `, { source: 'https://github.com/example/cli', pushedAt, lastCommitAt: pushedAt });
  assert.equal(exitCode, 0);
  assert.equal(output.example.lastCommitAt, pushedAt);
  assert.equal(output.example.stars, 99);
  assert.notEqual(output.example.checkedAt, '2026-09-01T00:00:00Z');
});


test('Failed first identity migration cannot overwrite activity from a reused catalog name', async () => {
  const { exitCode, output, previous } = await scenario('refresh-activity', `throw new Error('Legacy name must not be queried');`, { repositoryId: undefined, status: 'error' });
  assert.equal(exitCode, 1);
  assert.deepEqual(output.example.weeks, previous.example.weeks);
  assert.equal(output.example.checkedAt, previous.example.checkedAt);
  assert.equal(output.example.status, 'error');
});

test('Deferred activity retry recovers a real 202 then 200 response', async () => {
  const { exitCode, output } = await scenario('refresh-activity', `
    globalThis.attempts = (globalThis.attempts ?? 0) + 1;
    if (globalThis.attempts === 1) return new Response(null, {status: 202});
    if (globalThis.attempts > 2) throw new Error('Retried after success');
    return Response.json({all: Array(52).fill(7)});
  `);
  assert.equal(exitCode, 0);
  assert.equal(output.example.status, 'ok');
  assert.deepEqual(output.example.weeks, Array(52).fill(7));
});
