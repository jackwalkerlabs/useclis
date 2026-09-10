import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { packageCommands, formulaCommands, repoFromUrl, evaluateCandidate, validateConfig, remainingToday } from './lib/cli-evidence.mjs';
import { sumInstallRequests } from '../src/lib/homebrew.mjs';

const API = 'https://api.github.com';
const BREW = 'https://formulae.brew.sh/api';
const root = new URL('../', import.meta.url);
const MAX_BYTES = 8_000_000;
export class SourceTooLargeError extends Error {
  constructor(url) { super(`${new URL(url).hostname}${new URL(url).pathname}: source exceeds size limit`); }
}
const freshDate = (date, now) => {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))) return false;
  const age = Date.parse(now) - Date.parse(date);
  return new Date(date).toISOString().slice(0, 10) === date && age >= -86400000 && age <= 7 * 86400000;
};

/** Credentials are sent only to GitHub; provider redirects cannot forward them. */
export function createClient(token, fetcher = fetch) {
  return async function request(url, { optional = false, text = false } = {}) {
    const host = new URL(url).hostname;
    if (!['api.github.com', 'formulae.brew.sh'].includes(host) || !url.startsWith('https://')) throw new Error('Unsupported source host');
    const options = {
      redirect: 'manual', signal: AbortSignal.timeout(20_000),
      headers: { Accept: 'application/json', 'User-Agent': 'useclis-discovery', ...(host === 'api.github.com' ? { Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' } : {}) },
    };
    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await fetcher(url, { ...options, signal: AbortSignal.timeout(20_000) });
        if (response.status < 500 || attempt === 2) break;
        await response.body?.cancel();
      } catch (error) {
        if (attempt === 2) throw new Error(`${host}${new URL(url).pathname}: ${error.message}`);
      }
      await delay(500 * (attempt + 1));
    }
    if (optional && [301, 404].includes(response.status)) return null;
    if (!response.ok) throw new Error(`${host}: HTTP ${response.status}`);
    if (Number(response.headers.get('content-length')) > MAX_BYTES) { await response.body?.cancel(); throw new SourceTooLargeError(url); }
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) { await reader.cancel(); throw new SourceTooLargeError(url); }
      chunks.push(value);
    }
    const body = Buffer.concat(chunks).toString('utf8');
    return text ? body : JSON.parse(body);
  };
}

export function brewCandidates(report, minimum) {
  if (!report.formulae || report.category !== 'formula_install_on_request' || !/^\d{4}-\d{2}-\d{2}$/.test(report.end_date)) throw new Error('Invalid Homebrew discovery report');
  const results = [];
  for (const [formula, variants] of Object.entries(report.formulae)) {
    // Restrict discovery to unversioned Homebrew/core formulae, including their HEAD variants.
    if (!/^[a-z0-9][a-z0-9+_.-]*$/.test(formula) || !Array.isArray(variants)) continue;
    let count = 0;
    for (const variant of variants) {
      if (![formula, `${formula} --HEAD`, `${formula} (HEAD)`].includes(variant.formula)) continue;
      if (typeof variant.count !== 'string' || !/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(variant.count)) throw new Error('Invalid Homebrew count');
      count += Number(variant.count.replaceAll(',', ''));
    }
    if (!Number.isSafeInteger(count)) throw new Error('Invalid Homebrew total');
    if (count >= minimum) results.push({ formula, count });
  }
  return results.sort((a, b) => a.formula.localeCompare(b.formula));
}

async function fetchFormula(request, formula, now) {
  const source = `${BREW}/formula/${formula}.json`;
  let data;
  try { data = await request(source, { optional: true }); }
  catch (error) { if (error instanceof SourceTooLargeError) return null; throw error; }
  if (!data || data.name !== formula || data.tap !== 'homebrew/core' || data.disabled || data.deprecated) return null;
  // Source archive/head is stronger identity evidence than a marketing homepage.
  const repo = repoFromUrl(data.urls?.stable?.url) ?? repoFromUrl(data.urls?.head?.url);
  if (!repo) return null;
  const count = sumInstallRequests(data.analytics?.install_on_request?.['30d']);
  if (!freshDate(data.generated_date, now)) return null;
  return { repo, formula, count, source, generatedDate: data.generated_date, data };
}

async function collectCandidates(request, state, config, now) {
  // Resume the durable queue before fetching another source window. Only identities
  // are carried forward: counts, metadata, manifests, and docs are fetched anew.
  if (state.pending?.length) return { candidates: state.pending.map(item => ({ ...item })), searchPage: state.searchPage, brewOffset: state.brewOffset };
  const github = [];
  for (const query of config.queries) {
    const q = `${query} stars:>=${config.minStars} archived:false fork:false`;
    const response = await request(`${API}/search/repositories?q=${encodeURIComponent(q)}&sort=updated&order=desc&per_page=100&page=${state.searchPage}`);
    if (!Array.isArray(response.items) || response.incomplete_results) throw new Error('Incomplete GitHub search');
    github.push(...response.items.map(repo => ({ repo: repo.full_name })));
  }
  const report = await request(`${BREW}/analytics/install-on-request/homebrew-core/30d.json`);
  if (!freshDate(report.end_date, now)) throw new Error('Stale or invalid Homebrew report');
  const formulae = brewCandidates(report, config.minHomebrew30d);
  const brew = [];
  const start = state.brewOffset % Math.max(1, formulae.length);
  const slice = formulae.slice(start, start + config.maxCandidates);
  for (const candidate of slice) {
    const formula = await fetchFormula(request, candidate.formula, now);
    if (formula) brew.push({ repo: formula.repo, brew: formula });
  }
  const combined = new Map();
  // Alternate sources so popular Homebrew tools don't starve GitHub-only candidates.
  for (let i = 0; i < Math.max(github.length, brew.length); i++) for (const candidate of [brew[i], github[i]]) {
    if (!candidate || !/^[\w.-]+\/[\w.-]+$/.test(candidate.repo)) continue;
    const key = candidate.repo.toLowerCase();
    if (!combined.has(key) || candidate.brew) combined.set(key, candidate);
  }
  return { candidates: [...combined.values()], searchPage: state.searchPage % 10 + 1, brewOffset: (start + slice.length) % Math.max(1, formulae.length) };
}

async function collectEvidence(request, candidate, repo) {
  const commit = await request(`${API}/repos/${repo.full_name}/commits/${encodeURIComponent(repo.default_branch)}`);
  if (!/^[a-f0-9]{40}$/.test(commit.sha)) throw new Error('Invalid commit identity');
  const tree = await request(`${API}/repos/${repo.full_name}/git/trees/${commit.sha}?recursive=1`);
  if (!Array.isArray(tree.tree) || tree.truncated) return { declarations: [], docs: [], commit: commit.sha };
  const files = tree.tree.filter(file => file.type === 'blob' && file.mode === '100644' && file.size <= 200_000 && !/(^|\/)(?:node_modules|vendor|test|tests|fixtures|examples|\.git)(\/|$)/i.test(file.path));
  // Executable source files can carry mode 100755.
  const paths = new Set(tree.tree.filter(file => file.type === 'blob' && ['100644', '100755'].includes(file.mode)).map(file => file.path));
  const declarations = [];
  const docs = [];
  const read = async file => {
    const data = await request(`${API}/repos/${repo.full_name}/git/blobs/${file.sha}`);
    if (data.encoding !== 'base64' || typeof data.content !== 'string') throw new Error('Invalid source blob');
    return { text: Buffer.from(data.content, 'base64').toString('utf8'), url: `https://github.com/${repo.full_name}/blob/${commit.sha}/${file.path.split('/').map(encodeURIComponent).join('/')}` };
  };
  const manifests = files.filter(file => /(?:^|\/)(?:package.json|pyproject.toml|Cargo.toml)$/.test(file.path) && file.path.split('/').length <= 4).sort((a, b) => a.path.length - b.path.length).slice(0, 8);
  for (const file of manifests) {
    const source = await read(file);
    declarations.push(...packageCommands(file.path, source.text, paths).map(command => ({ ...command, url: source.url })));
  }
  const documentation = files.filter(file => /(?:^|\/)(?:readme|usage|installation|getting-started)\.(?:md|mdx|rst)$/i.test(file.path) && file.path.split('/').length <= 3).sort((a, b) => a.path.length - b.path.length).slice(0, 4);
  for (const file of documentation) docs.push(await read(file));
  const brew = candidate.brew;
  if (brew && brew.repo.toLowerCase() === repo.full_name.toLowerCase()) {
    // Current formula API explicitly reports installed executable names.
    if (Array.isArray(brew.data.executables)) {
      for (const command of brew.data.executables) if (typeof command === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.+-]{0,63}$/.test(command)) {
        declarations.push({ command, packageName: brew.formula, ecosystem: 'brew', declaration: JSON.stringify({ executables: [command] }), url: brew.source, target: null });
      }
    } else if (/^[a-f0-9]{40}$/.test(brew.data.tap_git_head) && /^Formula\/[a-z0-9/]?[\w/+.@-]+\.rb$/.test(brew.data.ruby_source_path)) {
      const path = brew.data.ruby_source_path;
      const formula = await request(`${API}/repos/Homebrew/homebrew-core/contents/${path}?ref=${brew.data.tap_git_head}`);
      if (formula.encoding !== 'base64') throw new Error('Invalid formula source');
      const content = Buffer.from(formula.content, 'base64');
      if (createHash('sha256').update(content).digest('hex') !== brew.data.ruby_source_checksum?.sha256) throw new Error('Formula checksum mismatch');
      declarations.push(...formulaCommands(content.toString('utf8'), brew.formula).map(command => ({ ...command, url: `https://github.com/Homebrew/homebrew-core/blob/${brew.data.tap_git_head}/${path}` })));
    }
    // Homebrew's official formula page documents this exact installation command.
    docs.push({ text: `brew install ${brew.formula}`, url: `https://formulae.brew.sh/formula/${brew.formula}` });
  }
  return { declarations, docs, commit: commit.sha };
}

export async function discover({ catalog, state, mappings, config, request, now = new Date().toISOString() }) {
  validateConfig(config);
  if (state.version !== 1 || !Number.isInteger(state.searchPage) || state.searchPage < 1 || state.searchPage > 10 || !Number.isSafeInteger(state.brewOffset) || state.brewOffset < 0 || !state.candidates || Array.isArray(state.candidates)) throw new Error('Invalid discovery state');
  if (state.pending != null && (!Array.isArray(state.pending) || state.pending.length > 1000 || state.pending.some(item => !item || !/^[\w.-]+\/[\w.-]+$/.test(item.repo) || (item.formula != null && !/^[a-z0-9][a-z0-9+_.-]*$/.test(item.formula))))) throw new Error('Invalid pending candidates');
  const next = structuredClone(state);
  const entries = [...catalog];
  const nextMappings = { ...mappings };
  const accepted = [];
  const outcomes = [];
  const available = remainingToday(next, now, config.maxPerDay);
  if (!available) return { catalog, state, mappings, accepted, outcomes, message: 'Daily publication cap reached' };
  const found = await collectCandidates(request, next, config, now);
  let checked = 0;
  let cursor = 0;
  for (; cursor < found.candidates.length; cursor++) {
    if (checked >= config.maxCandidates || accepted.length >= available) break;
    const candidate = found.candidates[cursor];
    const key = candidate.repo.toLowerCase();
    const previous = next.candidates[key];
    if (entries.some(tool => tool.repo.toLowerCase() === key) || previous?.status === 'rejected' || previous?.status === 'accepted') continue;
    if (previous?.checkedAt && Date.parse(now) - Date.parse(previous.checkedAt) < config.recheckDays * 86400000) continue;
    checked++;
    if (candidate.formula && !candidate.brew) candidate.brew = await fetchFormula(request, candidate.formula, now);
    let repo;
    try { repo = await request(`${API}/repos/${candidate.repo}`, { optional: true }); }
    catch (error) {
      if (!(error instanceof SourceTooLargeError)) throw error;
      next.candidates[key] = { status: 'held', checkedAt: now, reason: error.message };
      outcomes.push({ repo: key, status: 'held', reason: error.message });
      continue;
    }
    // GitHub redirects are not followed. Renamed repositories are held until rediscovered canonically.
    if (!repo) {
      next.candidates[key] = { status: 'held', checkedAt: now, reason: 'Repository unavailable or renamed' };
      outcomes.push({ repo: key, status: 'held', reason: 'Repository unavailable or renamed' });
      continue;
    }
    const brew = candidate.brew && { repo: candidate.brew.repo, formula: candidate.brew.formula, count: candidate.brew.count, source: candidate.brew.source, generatedDate: candidate.brew.generatedDate };
    let result = evaluateCandidate({ repo, declarations: [], docs: [], brew, config, existing: entries });
    if (result.reason === 'No matching package declaration, installation, and useful command example') {
      try {
        const evidence = await collectEvidence(request, candidate, repo);
        result = evaluateCandidate({ repo, ...evidence, brew, config, existing: entries });
        if (result.evidence) result.evidence.commit = evidence.commit;
      } catch (error) {
        if (!(error instanceof SourceTooLargeError)) throw error;
        result = { status: 'held', reason: error.message };
      }
    }
    const record = { status: result.status, checkedAt: now, reason: result.reason };
    if (result.status === 'accepted') {
      entries.push(result.entry);
      accepted.push(result.entry);
      Object.assign(record, { slug: result.entry.slug, acceptedAt: now, evidence: result.evidence });
      if (brew && !Object.values(nextMappings).some(mapping => mapping.formula === brew.formula)) nextMappings[result.entry.slug] = { formula: brew.formula, repo: repo.full_name };
    }
    next.candidates[key] = record;
    outcomes.push({ repo: key, status: result.status, reason: result.reason });
  }
  // Progress search windows only after processing the batch successfully.
  next.searchPage = found.searchPage;
  next.brewOffset = found.brewOffset;
  next.pending = found.candidates.slice(cursor).map(candidate => {
    const formula = candidate.brew?.formula ?? candidate.formula;
    return { repo: candidate.repo, ...(formula ? { formula } : {}) };
  });
  next.lastRunAt = now;
  return { catalog: entries, state: next, mappings: nextMappings, accepted, outcomes };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--apply')) throw new Error('Usage: npm run discover -- [--apply]');
  if (!process.env.GITHUB_TOKEN) throw new Error('Set GITHUB_TOKEN for discovery API requests');
  const load = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
  const result = await discover({
    catalog: await load('src/data/catalog.json'), state: await load('discovery/state.json'),
    mappings: await load('src/data/homebrew-mappings.json'), config: await load('discovery/config.json'),
    request: createClient(process.env.GITHUB_TOKEN),
  });
  await mkdir(new URL('artifacts/', root), { recursive: true });
  await writeFile(new URL('artifacts/discovery-report.json', root), JSON.stringify(result, null, 2) + '\n');
  if (args.includes('--apply')) {
    for (const [path, value] of [['src/data/catalog.json', result.catalog], ['src/data/homebrew-mappings.json', result.mappings], ['discovery/state.json', result.state]]) {
      await writeFile(new URL(path, root), JSON.stringify(value, null, 2) + '\n');
    }
  }
  console.log(JSON.stringify({ applied: args.includes('--apply'), accepted: result.accepted.map(entry => entry.repo), checked: result.outcomes.length, message: result.message ?? null }, null, 2));
  if (process.env.GITHUB_OUTPUT) await writeFile(process.env.GITHUB_OUTPUT, `additions=${result.accepted.length}\n`, { flag: 'a' });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(`Discovery failed: ${error.message}. No automatic publication.`); process.exitCode = 1; });
}
