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
async function scenario(script, fetchBody) {
  const root = await mkdtemp(join(tmpdir(), 'useclis-refresh-'));
  const previous = { example: { stars: 10, checkedAt: '2026-09-01T00:00:00Z', weeks: Array(52).fill(3) } };
  try {
    await mkdir(join(root, 'scripts/lib'), { recursive: true });
    await copyFile(new URL('./lib/refresh-selection.mjs', import.meta.url), join(root, 'scripts/lib/refresh-selection.mjs'));
    await mkdir(join(root, 'src/data'), { recursive: true });
    await copyFile(new URL(`./${script}.mjs`, import.meta.url), join(root, 'scripts', `${script}.mjs`));
    await writeFile(join(root, 'src/data/catalog.json'), JSON.stringify([{ slug: 'example', name: 'Example', repo: 'example/cli' }]));
    for (const file of ['activity', 'repositories']) await writeFile(join(root, `src/data/${file}.json`), JSON.stringify(previous));
    const code = `globalThis.fetch = async (url, options) => {
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
  assert.deepEqual(output, previous);
});

test('Rate limits, invalid activity, and network failures preserve history and fail the refresh', async () => {
  for (const response of [
    'return new Response(null, { status: 403 });',
    'return Response.json({ all: [1, 2, 3] });',
    'throw new Error("Connection failed");',
  ]) {
    const { exitCode, output, previous } = await scenario('refresh-activity', response);
    assert.equal(exitCode, 1);
    assert.deepEqual(output, previous);
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
    return Response.json({ stargazers_count: 99, html_url: 'https://github.com/example/cli', owner: { avatar_url: 'https://avatars.example/user' } });
  `);
  assert.equal(exitCode, 1);
  assert.deepEqual(output, previous);
});

test('Repository refresh builds a valid avatar URL and commits complete metadata', async () => {
  const { exitCode, output } = await scenario('refresh-data', `
    if (String(url).includes('/commits?')) return Response.json([{ commit: { committer: { date: '2026-09-09T00:00:00Z' } } }]);
    if (String(url).includes('avatars.example')) {
      if (new URL(url).searchParams.get('s') !== '96') throw new Error('Missing avatar size parameter');
      return new Response('image bytes');
    }
    return Response.json({ stargazers_count: 99, license: { spdx_id: 'MIT' }, html_url: 'https://github.com/example/cli', owner: { avatar_url: 'https://avatars.example/user' } });
  `);
  assert.equal(exitCode, 0);
  assert.equal(output.example.stars, 99);
  assert.equal(output.example.license, 'MIT');
});
