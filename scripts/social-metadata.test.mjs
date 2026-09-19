import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { cardCommands } from './build-share-image.mjs';
import { defaultShareImage } from '../src/lib/social.ts';
import { tools } from '../src/data/tools.ts';

test('Share card shows only catalog commands and matches its declared dimensions', async () => {
  for (const command of cardCommands) assert.ok(tools.some(tool => tool.command === command), `${command} is listed`);
  const png = await readFile(new URL(`../public${defaultShareImage.path}`, import.meta.url));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [defaultShareImage.width, defaultShareImage.height]);
  assert.ok(png.length < 300_000, 'share image stays small enough for link unfurlers');
});

test('Shared layout emits complete Open Graph and X card metadata without remote assets', async () => {
  const layout = await readFile(new URL('../src/layouts/Layout.astro', import.meta.url), 'utf8');
  for (const tag of ['og:url', 'og:image', 'og:image:width', 'og:image:height', 'og:image:alt', 'twitter:card', 'twitter:image']) {
    assert.match(layout, new RegExp(`"${tag}"`), tag);
  }
  assert.doesNotMatch(layout, /<(?:script|link|img)[^>]+(?:src|href)="https?:/, 'no third-party pixels, scripts, or fonts');
});
