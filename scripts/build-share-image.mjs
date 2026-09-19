// Renders public/og-image.png (1200×630) from local HTML with the self-hosted
// Inconsolata font. Run `npm run build:share-image` after changing the copy.
// The card deliberately avoids catalog counts so it cannot go stale.
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = new URL('..', import.meta.url);
const output = fileURLToPath(new URL('public/og-image.png', root));
const width = 1200;
const height = 630;
// Commands shown on the card; scripts/social-metadata.test.mjs checks they stay in the catalog.
export const cardCommands = ['jq', 'rg', 'agent-browser', 'gh'];

async function html() {
  const font = (await readFile(new URL('design-system/assets/fonts/inconsolata-latin-wght.woff2', root))).toString('base64');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Inconsolata;font-weight:200 900;src:url(data:font/woff2;base64,${font}) format("woff2")}
*{box-sizing:border-box;margin:0}
body{width:${width}px;height:${height}px;font-family:Inconsolata,monospace;color:#0b0e10;padding:60px 72px;display:flex;flex-direction:column;justify-content:space-between;
  background:#f6f7f8 radial-gradient(#e2e5e8 1.2px,transparent 1.2px) 0 0/24px 24px}
.top{display:flex;align-items:center;justify-content:space-between}
.mark{display:flex;align-items:center;gap:16px;font-size:44px;font-weight:800;letter-spacing:-1.4px}
.mark .dot{color:#1faf62}
.badge{display:inline-flex;align-items:center;gap:10px;background:#e9f8ef;color:#127a40;border-radius:99px;padding:8px 18px;font-size:22px;font-weight:600}
.badge i{width:10px;height:10px;border-radius:50%;background:#1faf62}
.main{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center}
h1{font-size:74px;line-height:1.02;letter-spacing:-3px;font-weight:800}
h1 span{color:#127a40}
p{margin-top:22px;font-size:27px;line-height:1.4;color:#5a646b}
.term{background:#0b0e10;border-radius:18px;padding:24px 28px;color:#e2e5e8;font-size:24px;line-height:1.6;box-shadow:0 18px 40px rgba(11,14,16,.18)}
.dots{display:flex;gap:8px;margin-bottom:14px}.dots i{width:12px;height:12px;border-radius:50%;background:#3d464c}
.prompt{color:#71d29a}.muted{color:#79838a}.cmd{color:#fff;font-weight:700}
.foot{display:flex;justify-content:space-between;font-size:24px;color:#5a646b}
.foot strong{color:#0b0e10}
</style></head><body>
<div class="top"><div class="mark"><svg width="56" height="56" viewBox="0 0 40 40"><rect width="40" height="40" rx="11" fill="#0b0e10"/><path d="m16 12-8 8 8 8m8-16 8 8-8 8" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="m22 10-4 20" stroke="#71d29a" stroke-width="2.5" stroke-linecap="round"/></svg><span>useclis<span class="dot">.</span></span></div>
<span class="badge"><i></i>Open source · GitHub-backed</span></div>
<div class="main"><div><h1>Command-line tools for <span>coding agents</span>.</h1><p>Find a CLI by task, inspect its repository, and hand your agent the whole catalog.</p></div>
<div class="term"><div class="dots"><i></i><i></i><i></i></div>
<div><span class="prompt">$</span> curl -s useclis.com/llms.txt</div>
<div class="muted"># task → CLI</div>
<div>Extract JSON fields → <span class="cmd">jq</span></div>
<div>Search a codebase → <span class="cmd">rg</span></div>
<div>Drive a browser → <span class="cmd">agent-browser</span></div>
<div>Work with GitHub → <span class="cmd">gh</span></div></div></div>
<div class="foot"><span>Search by task · Official docs · Repository activity</span><strong>useclis.com</strong></div>
</body></html>`;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.setContent(await html(), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: output, type: 'png' });
    console.log(`Wrote ${output}`);
  } finally {
    await browser.close();
  }
}
