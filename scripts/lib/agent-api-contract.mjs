// Contract checks for the public agent surfaces documented in docs/AGENT-API.md.
// Shared by unit tests, the built-site check, and production smoke tests so every
// stage enforces the same rules against the same kind of input: raw response bodies.

export const agentSurfaces = [
  { path: '/llms.txt', contentType: 'text/plain' },
  { path: '/llms-full.txt', contentType: 'text/plain' },
  { path: '/clis.json', contentType: 'application/json' },
];
export const supportedSchemaVersion = 1;
export const catalogEndMarker = count => `End of useclis catalog: ${count} tools.`;

const text = value => typeof value === 'string' && value.trim().length > 0;
const httpsUrl = value => {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
};
const isoDate = value => value === null || (typeof value === 'string' && Number.isFinite(Date.parse(value)));

/**
 * @param {{ guide: string, full: string, json: string, siteUrl: string | URL }} bodies Raw response bodies.
 * @returns {{ errors: string[], catalog: any }}
 */
export function validateAgentApi({ guide, full, json, siteUrl }) {
  const errors = [];
  const fail = message => errors.push(message);
  const site = new URL(siteUrl);
  let catalog;
  try { catalog = JSON.parse(json); } catch (error) {
    return { errors: [`clis.json is not valid JSON (possibly truncated): ${error.message}`], catalog: null };
  }

  if (catalog.schemaVersion !== supportedSchemaVersion) fail(`clis.json schemaVersion ${catalog.schemaVersion} is not ${supportedSchemaVersion}`);
  if (!Array.isArray(catalog.tools) || catalog.tools.length === 0) return { errors: [...errors, 'clis.json has no tools'], catalog };
  if (catalog.toolCount !== catalog.tools.length) fail(`clis.json toolCount ${catalog.toolCount} differs from ${catalog.tools.length} tools`);
  if (!text(catalog.dataNotice) || !/not instructions/i.test(catalog.dataNotice)) fail('clis.json is missing its data-only notice');
  if (!Array.isArray(catalog.categories) || !catalog.categories.every(text)) fail('clis.json categories must be non-empty strings');
  const { repositoryCheckedFrom: from, repositoryCheckedTo: to } = catalog.snapshot ?? {};
  if (!isoDate(from) || !isoDate(to) || (from && to && from > to)) fail(`clis.json snapshot dates are invalid: ${from} to ${to}`);

  const slugs = new Set();
  for (const [index, tool] of catalog.tools.entries()) {
    const id = tool?.slug ?? `tools[${index}]`;
    if (typeof tool.slug !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(tool.slug)) fail(`${id}: slug is not a stable lowercase identifier`);
    if (slugs.has(tool.slug)) fail(`${id}: duplicate slug`);
    slugs.add(tool.slug);
    for (const key of ['name', 'command', 'category', 'description', 'useCase', 'agentUse']) if (!text(tool[key])) fail(`${id}: ${key} is empty`);
    if (catalog.categories?.length && !catalog.categories.includes(tool.category)) fail(`${id}: category ${tool.category} is not listed`);
    if (tool.url !== new URL(`/tools/${tool.slug}/`, site).href) fail(`${id}: listing URL ${tool.url} does not match the site`);
    if (!/^https:\/\/github\.com\/[^/\s]+\/[^/\s]+$/.test(tool.repository ?? '')) fail(`${id}: repository ${tool.repository} is not a GitHub repository URL`);
    if (!httpsUrl(tool.docs)) fail(`${id}: docs ${tool.docs} is not an https URL`);
    if (tool.website != null && !httpsUrl(tool.website)) fail(`${id}: website ${tool.website} is not an https URL`);
    if (!Array.isArray(tool.features) || !tool.features.length || !tool.features.every(text)) fail(`${id}: features must be non-empty strings`);
    if (!isoDate(tool.repositorySnapshot?.checkedAt ?? null)) fail(`${id}: repositorySnapshot.checkedAt is not a date`);
  }

  const count = catalog.tools.length;
  if (!full.startsWith('# useclis CLI catalog\n')) fail('llms-full.txt has an unexpected header');
  if (!full.includes(`> ${count} command-line tools`)) fail(`llms-full.txt count differs from clis.json (${count})`);
  if (!full.includes(`schema version ${catalog.schemaVersion}`)) fail('llms-full.txt is missing its schema marker');
  if (!full.trimEnd().endsWith(catalogEndMarker(count))) fail('llms-full.txt does not end with its end-of-catalog marker (possibly truncated)');
  const listings = [...full.matchAll(/^- Listing: (\S+)$/gm)].map(match => match[1]);
  if (listings.length !== count) fail(`llms-full.txt has ${listings.length} listings, expected ${count}`);
  const seen = new Map();
  for (const listing of listings) seen.set(listing, (seen.get(listing) ?? 0) + 1);
  for (const tool of catalog.tools) {
    if (seen.get(tool.url) !== 1) fail(`${tool.slug}: appears ${seen.get(tool.url) ?? 0} times in llms-full.txt`);
    if (!full.includes(`## ${tool.name}\n`)) fail(`${tool.slug}: llms-full.txt is missing its heading`);
  }

  if (!guide.startsWith('# useclis\n')) fail('llms.txt has an unexpected header');
  for (const path of ['/llms-full.txt', '/clis.json']) if (!guide.includes(new URL(path, site).href)) fail(`llms.txt does not link ${path} on ${site.origin}`);
  if (!guide.includes(`A directory of ${count} `)) fail(`llms.txt count differs from clis.json (${count})`);
  if (!/not instructions/i.test(guide)) fail('llms.txt is missing its data-only notice');
  if (!guide.trimEnd().endsWith('limitations.')) fail('llms.txt does not end with its final link (possibly truncated)');
  return { errors, catalog };
}

const stopWords = new Set(['a', 'an', 'the', 'from', 'to', 'of', 'in', 'on', 'for', 'and', 'or', 'with', 'my', 'some', 'into']);

/** A minimal agent-style lookup: rank catalog tools by task-term matches, then stars. */
export function findToolsForTask(catalog, task) {
  const terms = task.toLowerCase().split(/[^a-z0-9]+/).filter(term => term && !stopWords.has(term));
  return catalog.tools.map(tool => {
    const haystack = [tool.name, tool.command, tool.description, tool.useCase, tool.agentUse, ...tool.features].join(' ').toLowerCase();
    return { tool, score: terms.filter(term => haystack.includes(term)).length };
  }).filter(match => match.score > 0)
    .sort((a, b) => b.score - a.score || (b.tool.repositorySnapshot?.stars ?? 0) - (a.tool.repositorySnapshot?.stars ?? 0))
    .map(match => match.tool);
}

export const jsonExtractionFixture = { task: 'Extract a field value from JSON output', expectedSlug: 'jq' };
