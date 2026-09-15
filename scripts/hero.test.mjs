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

test('Homepage example uses the actual jq listing, docs and command, and omits it if absent', () => {
  const jq = tools.find(tool => tool.slug === 'jq');
  assert.ok(jq);
  const example = hero(tools).querySelector('.agent-prompt-example');
  assert.match(example.textContent, /Read the package name from JSON/);
  assert.equal(example.querySelector('code').textContent, jq.example);
  assert.equal(example.querySelector(`a[href="/tools/${jq.slug}/"]`).textContent, jq.name);
  assert.ok(example.querySelector(`a[href="${jq.docs}"]`));
  assert.equal(hero(tools.filter(tool => tool.slug !== 'jq')).querySelector('.agent-prompt-example'), null);
});
