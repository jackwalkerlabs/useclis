import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import Directory from '../src/components/Directory.tsx';
import { tools } from '../src/data/tools.ts';

function hero(catalog) {
  const dom = new JSDOM(renderToStaticMarkup(h(Directory, { tools: catalog })));
  return dom.window.document.querySelector('.useclis-hero');
}

test('Homepage uses the supplied catalog count and keeps a literal sentence separator', () => {
  for (const catalog of [tools, tools.slice(0, 3)]) {
    const section = hero(catalog);
    assert.match(section.querySelector('h1').textContent, /humans.*coding agents/);
    const intro = section.querySelector('.hero-intro');
    assert.ok(intro.textContent.startsWith(`Discover ${catalog.length.toLocaleString('en-US')} command-line tools`));
    assert.match(intro.textContent, /task\. Browse/);
    assert.equal(intro.querySelector('br'), null);
    assert.ok(section.querySelector('[role="search"] input'));
    for (const path of ['/llms.txt', '/llms-full.txt', '/clis.json']) {
      assert.ok(section.querySelector(`a[href="${path}"]`), `${path} is visible without opening the prompt`);
    }
  }
});

test('Homepage offers catalog-backed task examples across categories and drops drifted ones', async () => {
  const { homepageExamples, resolveHomepageExamples } = await import('../src/lib/homepage-examples.ts');
  const resolved = resolveHomepageExamples(tools);
  assert.equal(resolved.length, homepageExamples.length, 'every homepage example still matches its catalog record');
  assert.ok(resolved.length >= 3);
  assert.equal(new Set(resolved.map(example => example.tool.category)).size, resolved.length, 'examples span different categories');
  const section = hero(tools);
  const chips = [...section.querySelectorAll('.agent-prompt-chips button')];
  assert.deepEqual(chips.map(chip => chip.textContent), resolved.map(example => example.label));
  assert.equal(chips[0].getAttribute('aria-pressed'), 'true');
  const [first] = resolved;
  const result = section.querySelector('.agent-prompt-result');
  assert.equal(result.querySelector('.agent-prompt-task').textContent, `“${first.task}”`);
  assert.equal(result.querySelector('code').textContent, `$ ${first.tool.example}`);
  assert.equal(result.querySelector(`a[href="/tools/${first.tool.slug}/"]`).textContent, first.tool.name);
  assert.ok(result.querySelector(`a[href="${first.tool.docs}"]`));
  assert.match(section.querySelector('.agent-prompt-heading p').textContent, /official docs/);
  assert.match(section.querySelector('.agent-prompt-caveat').textContent, /guarantee/);
  // A changed command that no longer supports the task text is dropped, not shown.
  const drifted = tools.map(tool => tool.slug === 'jq' ? { ...tool, example: 'jq --help' } : tool);
  assert.deepEqual(resolveHomepageExamples(drifted).map(example => example.tool.slug), resolved.map(example => example.tool.slug).filter(slug => slug !== 'jq'));
  assert.equal(hero(tools.filter(tool => !homepageExamples.some(example => example.slug === tool.slug))).querySelector('.agent-prompt-examples'), null);
});
