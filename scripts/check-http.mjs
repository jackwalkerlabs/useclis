import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// Run against the built site, e.g. `wrangler dev --local --port 8793`.
const base = process.argv[2];
if (!base) throw new Error('Pass the local production URL: node scripts/check-http.mjs http://localhost:8793');
const root = fileURLToPath(new URL('../dist/', import.meta.url));
// Fail before crawling if the port belongs to a different application.
const home = await fetch(new URL('/', base), { signal: AbortSignal.timeout(10_000) });
assert.equal(home.status, 200);
assert.deepEqual(Buffer.from(await home.arrayBuffer()), await readFile(join(root, 'index.html')), 'This URL is not serving the current useclis build');
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : join(directory, entry.name)))).flat();
}
const files = await walk(root);
let index = 0;
const failures = [];
await Promise.all(Array.from({ length: 6 }, async () => {
  while (index < files.length) {
    const file = files[index++];
    // Cloudflare consumes these configuration files rather than serving them.
    if (['_headers', '_redirects'].includes(relative(root, file))) continue;
    const path = '/' + relative(root, file).replace(/index\.html$/, '');
    try {
      const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(15_000) });
      assert.equal(response.status, 200);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(file), 'Response differs from the built file');
    } catch (error) { failures.push(`${path}: ${error.message}`); }
  }
}));
const missing = await fetch(new URL('/a-cli-that-does-not-exist/', base), { signal: AbortSignal.timeout(10_000) });
assert.equal(missing.status, 404, 'Missing routes must return HTTP 404');
assert.deepEqual(Buffer.from(await missing.arrayBuffer()), await readFile(join(root, '404.html')));
assert.deepEqual(failures, []);
console.log(`Verified all served files from ${files.length} build files against their exact contents; missing route returns the custom 404 page.`);
