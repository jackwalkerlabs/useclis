import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const origin = 'http://useclis.test';
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : join(directory, entry.name)))).flat();
}
const files = (await walk(root)).filter(file => file.endsWith('.html'));
const links = new Map();
const pageIds = new Map();
const errors = [];
for (const file of files) {
  const path = '/' + relative(root, file).replace(/index\.html$/, '');
  const dom = new JSDOM(await readFile(file, 'utf8'), { url: origin + path });
  const document = dom.window.document;
  const ids = [...document.querySelectorAll('[id]')].map(node => node.id);
  if (ids.length !== new Set(ids).size) errors.push(`${path}: duplicate element IDs`);
  pageIds.set(file, new Set(ids));
  for (const node of document.querySelectorAll('[href], [src], [component-url], [renderer-url]')) {
    for (const attribute of ['href', 'src', 'component-url', 'renderer-url']) {
      const value = node.getAttribute(attribute);
      if (value === null) continue;
      if (!value || value === '#') { errors.push(`${path}: empty ${attribute}`); continue; }
      const url = new URL(value, origin + path);
      if (url.origin === origin) links.set(url.pathname + url.hash, path);
    }
  }
  for (const button of document.querySelectorAll('button')) {
    if (!(button.getAttribute('aria-label') || button.textContent).trim()) errors.push(`${path}: unnamed button`);
  }
  for (const image of document.querySelectorAll('img')) {
    if (!image.hasAttribute('alt')) errors.push(`${path}: image missing alt text`);
  }
  dom.window.close();
}
const paths = new Set();
let anchors = 0;
for (const [link, from] of links) {
  const url = new URL(link, origin);
  let file = join(root, decodeURIComponent(url.pathname));
  try {
    const info = await stat(file);
    if (info.isDirectory()) { file = join(file, 'index.html'); await stat(file); }
    paths.add(url.pathname);
    if (url.hash) {
      anchors++;
      if (!pageIds.get(file)?.has(decodeURIComponent(url.hash.slice(1)))) errors.push(`${from}: missing anchor ${link}`);
    }
  } catch { errors.push(`${from}: missing route or asset ${link}`); }
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Checked ${paths.size} local routes/assets and ${anchors} anchors across ${files.length} HTML pages; button names, image alternatives, and IDs passed.`);
