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
const nullable = (value, check) => value === null || check(value);
const evidence = value => value !== null && typeof value === 'object' && text(value.text) && httpsUrl(value.source) && isoDate(value.checkedAt ?? null);

/** Reviewed capability evidence; null means not yet reviewed. */
function profileErrors(profile) {
  if (profile === null) return [];
  if (typeof profile !== 'object') return ['agentProfile must be an object or null'];
  const errors = [];
  if (!text(profile.reviewedAt) || !isoDate(profile.reviewedAt)) errors.push('agentProfile.reviewedAt is not a date');
  if (!text(profile.verification)) errors.push('agentProfile.verification is empty');
  const capabilities = Object.values(profile.capabilities ?? {});
  if (!capabilities.length || !capabilities.every(evidence)) errors.push('agentProfile.capabilities must be dated https evidence');
  const workflow = profile.workflow ?? {};
  for (const key of ['title', 'context']) if (!text(workflow[key])) errors.push(`agentProfile.workflow.${key} is empty`);
  for (const key of ['setup', 'expected']) if (!evidence(workflow[key])) errors.push(`agentProfile.workflow.${key} must be https evidence`);
  if (!Array.isArray(workflow.commands) || !workflow.commands.length || !workflow.commands.every(text)) errors.push('agentProfile.workflow.commands must be non-empty strings');
  return errors;
}

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
  for (const key of ['description', 'guidance']) if (!text(catalog[key])) fail(`clis.json ${key} is empty`);
  if (!Array.isArray(catalog.categories) || !catalog.categories.every(text)) fail('clis.json categories must be non-empty strings');
  const { repositoryCheckedFrom: from, repositoryCheckedTo: to } = catalog.snapshot ?? {};
  if (!isoDate(from) || !isoDate(to) || (from && to && from > to)) fail(`clis.json snapshot dates are invalid: ${from} to ${to}`);

  const slugs = new Set();
  for (const [index, tool] of catalog.tools.entries()) {
    const id = tool?.slug ?? `tools[${index}]`;
    if (typeof tool.slug !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(tool.slug)) fail(`${id}: slug is not a stable lowercase identifier`);
    if (slugs.has(tool.slug)) fail(`${id}: duplicate slug`);
    slugs.add(tool.slug);
    for (const key of ['name', 'command', 'category', 'description', 'useCase', 'agentUse', 'example']) if (!text(tool[key])) fail(`${id}: ${key} is empty`);
    // Nullable fields must still be present: a missing key is a schema change, not an unknown value.
    for (const key of ['agentWorkflowSupport', 'agentProfile']) if (!(key in tool)) fail(`${id}: ${key} is missing`);
    if (!nullable(tool.agentWorkflowSupport ?? null, text)) fail(`${id}: agentWorkflowSupport must be a string or null`);
    for (const error of profileErrors(tool.agentProfile ?? null)) fail(`${id}: ${error}`);
    const snapshot = tool.repositorySnapshot;
    if (snapshot === null || typeof snapshot !== 'object') fail(`${id}: repositorySnapshot is missing`);
    else {
      for (const key of ['stars', 'license', 'checkedAt']) if (!(key in snapshot)) fail(`${id}: repositorySnapshot.${key} is missing`);
      if (!nullable(snapshot.stars ?? null, value => Number.isInteger(value) && value >= 0)) fail(`${id}: repositorySnapshot.stars must be a non-negative integer or null`);
      if (!nullable(snapshot.license ?? null, text)) fail(`${id}: repositorySnapshot.license must be a string or null`);
    }
    if (catalog.categories?.length && !catalog.categories.includes(tool.category)) fail(`${id}: category ${tool.category} is not listed`);
    if (tool.url !== new URL(`/tools/${tool.slug}/`, site).href) fail(`${id}: listing URL ${tool.url} does not match the site`);
    if (!/^https:\/\/github\.com\/[^/\s]+\/[^/\s]+$/.test(tool.repository ?? '')) fail(`${id}: repository ${tool.repository} is not a GitHub repository URL`);
    if (!httpsUrl(tool.docs)) fail(`${id}: docs ${tool.docs} is not an https URL`);
    if (tool.website != null && !httpsUrl(tool.website)) fail(`${id}: website ${tool.website} is not an https URL`);
    if (!Array.isArray(tool.features) || !tool.features.length || !tool.features.every(text)) fail(`${id}: features must be non-empty strings`);
    if (!isoDate(snapshot?.checkedAt ?? null)) fail(`${id}: repositorySnapshot.checkedAt is not a date`);
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
