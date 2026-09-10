import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tools } from '../src/data/tools.ts';
import { GET as jsonRoute } from '../src/pages/clis.json.ts';
import { GET as textRoute } from '../src/pages/llms-full.txt.ts';
import { GET as guideRoute } from '../src/pages/llms.txt.ts';
import { agentPrompt } from '../src/lib/agent-prompt.ts';

test('Agent JSON includes every listing, its source documentation, and dated snapshots', async () => {
  const response = await jsonRoute({ site: new URL('https://directory.example/') });
  assert.match(response.headers.get('content-type'), /application\/json/);
  const catalog = await response.json();
  assert.equal(catalog.schemaVersion, 1);
  assert.equal(catalog.tools.length, tools.length);
  assert.equal(new Set(catalog.tools.map(tool => tool.slug)).size, tools.length);
  for (const source of tools) {
    const tool = catalog.tools.find(tool => tool.slug === source.slug);
    assert.equal(tool.url, `https://directory.example/tools/${source.slug}/`);
    assert.equal(tool.repository, `https://github.com/${source.repo}`);
    for (const key of ['name', 'docs', 'command', 'description', 'useCase', 'agentUse', 'example', 'features', 'agentWorkflowSupport']) assert.deepEqual(tool[key], source[key]);
    assert.equal(tool.repositorySnapshot.checkedAt, source.checkedAt ?? null);
    assert.equal(tool.repositorySnapshot.license, source.license ?? null);
  }
  const matches = catalog.tools.filter(tool => JSON.stringify([tool.name, tool.description, tool.features]).toLowerCase().includes('json'));
  assert.ok(matches.some(tool => tool.slug === 'jq'), 'A local task search should find jq');
});

test('Plain-text catalog exposes every CLI without HTML or browser hydration', async () => {
  const response = await textRoute({});
  assert.match(response.headers.get('content-type'), /text\/plain/);
  const text = await response.text();
  assert.ok(text.startsWith('# useclis CLI catalog\n'));
  for (const tool of tools) {
    assert.ok(text.includes(`## ${tool.name}\n`));
    assert.ok(text.includes(`https://useclis.com/tools/${tool.slug}/`));
    assert.ok(text.includes(tool.docs));
    assert.ok(text.includes(tool.example));
  }
});

test('Agent guide and copyable prompt point to curl-accessible resources on the configured site', async () => {
  const site = new URL('https://directory.example/');
  const response = await guideRoute({ site });
  assert.match(response.headers.get('content-type'), /text\/plain/);
  const guide = await response.text();
  for (const path of ['llms-full.txt', 'clis.json']) assert.ok(guide.includes(`https://directory.example/${path}`));
  assert.match(guide, /adding \?q= does not filter/);
  const prompt = agentPrompt(site.href);
  assert.ok(prompt.includes('https://directory.example/llms.txt'));
  assert.ok(prompt.includes('https://directory.example/llms-full.txt'));
  assert.ok(prompt.includes('curl -fsSL'));
});
