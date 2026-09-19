// Parses the built agent surfaces in dist/ and fails on any contract violation.
// Run after `npm run build`; production smoke tests apply the same checks live.
import { readFile } from 'node:fs/promises';
import { findToolsForTask, jsonExtractionFixture, validateAgentApi } from './lib/agent-api-contract.mjs';

const dist = new URL('../dist/', import.meta.url);
const read = path => readFile(new URL(path, dist), 'utf8');
const siteUrl = process.env.SITE_URL || 'https://useclis.com';
const [guide, full, json, build] = await Promise.all([read('llms.txt'), read('llms-full.txt'), read('clis.json'), read('build-info.json')]);
const { errors, catalog } = validateAgentApi({ guide, full, json, siteUrl });
if (catalog && JSON.parse(build).catalogCount !== catalog.tools.length) errors.push('build-info.json catalogCount differs from clis.json');
const match = catalog && findToolsForTask(catalog, jsonExtractionFixture.task)[0];
if (catalog && match?.slug !== jsonExtractionFixture.expectedSlug) errors.push(`Task fixture "${jsonExtractionFixture.task}" resolved to ${match?.slug ?? 'nothing'}, expected ${jsonExtractionFixture.expectedSlug}`);
if (errors.length) {
  console.error(`Agent API contract failed with ${errors.length} error(s):\n- ${errors.slice(0, 50).join('\n- ')}`);
  process.exit(1);
}
console.log(`Agent API contract passed: ${catalog.tools.length} tools, schema ${catalog.schemaVersion}; "${jsonExtractionFixture.task}" -> ${match.slug} (${match.docs}).`);
