import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import ts from 'typescript';

const root = new URL('../design-system/', import.meta.url);
const checkOnly = process.argv.includes('--check');
const stale = [];
async function emit(path, contents) {
  const url = new URL(path, root);
  if (!checkOnly) return writeFile(url, contents);
  const previous = await readFile(url, 'utf8').catch(() => '');
  if (previous !== contents) stale.push(path);
}
const manifest = JSON.parse(await readFile(new URL('_ds_manifest.json', root)));
const sourceHashes = {};
const chunks = [];
const components = [];
for (const group of ['core', 'data']) {
  for (const file of (await readdir(new URL(`components/${group}/`, root))).filter(file => file.endsWith('.jsx')).sort()) {
    const sourcePath = `components/${group}/${file}`;
    components.push({ name: file.slice(0, -4), sourcePath });
  }
}
// Component imports resolve through the registry after all definitions have loaded.
for (const { name, sourcePath } of components) {
  const source = await readFile(new URL(sourcePath, root), 'utf8');
  sourceHashes[sourcePath] = createHash('sha256').update(source).digest('hex').slice(0, 12);
  const imports = [...source.matchAll(/import\s*\{([^}]+)\}\s*from\s*["'][^"']+["'];?/g)].flatMap(match => match[1].split(',').map(s => s.trim()));
  let body = source.replace(/^import[^\n]+\n/gm, '').replace(/export function /g, 'function ');
  // Access imported components when rendering, not when registering their definitions.
  for (const dependency of imports) body = body.replace(new RegExp(`(<\\/?)(?:${dependency})(?=[\\s/>])`, 'g'), `$1window.UseclisDesignSystem.${dependency}`);
  const result = ts.transpileModule(body, { fileName: sourcePath, compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }, reportDiagnostics: true });
  if (result.diagnostics?.some(d => d.category === ts.DiagnosticCategory.Error)) throw new Error(`Cannot compile ${sourcePath}`);
  chunks.push(`// ${sourcePath}\n(() => {\n${result.outputText}\nwindow.UseclisDesignSystem.${name} = ${name};\n})();`);
}
manifest.namespace = 'UseclisDesignSystem';
manifest.components = components;
// Keep the design gallery metadata in sync with each preview's annotations.
for (const entry of [...manifest.cards, ...manifest.startingPoints]) {
  const path = entry.previewPath ?? entry.path;
  const source = await readFile(new URL(path, root), 'utf8');
  const annotation = source.match(entry.previewPath ? /@startingPoint ([^\n]*?)-->/ : /@dsCard ([^\n]*?)-->/);
  if (annotation) for (const match of annotation[1].matchAll(/(group|name|subtitle|viewport|section)="([^"]*)"/g)) entry[match[1]] = match[2];
}
for (const entry of manifest.startingPoints) {
  if (entry.name === 'ToolCard') Object.assign(entry, { section: 'Directory', subtitle: 'CLI listing card' });
  if (entry.name === 'LeaderboardRow') Object.assign(entry, { section: 'Directory', subtitle: 'CLI ranking row' });
  if (entry.name === 'SourceBadge') Object.assign(entry, { section: 'Data', subtitle: 'Repository data source' });
}
const metadata = { format: 4, namespace: manifest.namespace, components, sourceHashes, inlinedExternals: [], unexposedExports: [] };
await emit('_ds_manifest.json', JSON.stringify(manifest, null, 2) + '\n');
await emit('_ds_bundle.js', `/* @ds-bundle: ${JSON.stringify(metadata)} */\nwindow.UseclisDesignSystem = {};\n${chunks.join('\n')}\n`);
const catalog = JSON.parse(await readFile(new URL('../src/data/catalog.json', import.meta.url)));
const repositories = JSON.parse(await readFile(new URL('../src/data/repositories.json', import.meta.url)));
const tools = catalog.map(tool => ({ ...tool, stars: repositories[tool.slug]?.stars ?? null, license: repositories[tool.slug]?.license ?? null, checkedAt: repositories[tool.slug]?.checkedAt ?? null }));
await emit('ui_kits/web/data.js', `// Generated from the checked-in catalog and repository snapshots.\nwindow.USECLIS_DATA = ${JSON.stringify({ tools, categories: [...new Set(tools.map(tool => tool.category))] }, null, 2)};\n`);
if (stale.length) {
  console.error(`Stale design-system files: ${stale.join(', ')}. Run npm run build:design-system.`);
  process.exitCode = 1;
} else {
  console.log(`${checkOnly ? 'Verified' : 'Built'} ${components.length} useclis components and ${tools.length} CLI preview entries.`);
}
