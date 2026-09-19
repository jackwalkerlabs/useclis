import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

type Tool = { slug: string; name: string; command: string; category: string; repository: string; docs: string };
async function readCatalog(request: APIRequestContext): Promise<Tool[]> {
  const response = await request.get('/clis.json');
  expect(response.status(), 'clis.json must be available').toBe(200);
  expect(response.headers()['content-type']).toContain('application/json');
  const catalog = await response.json();
  expect(catalog.schemaVersion).toBe(1);
  expect(catalog.tools.length).toBeGreaterThan(0);
  expect(catalog.tools.some((tool: Tool) => tool.slug === 'ripgrep')).toBe(true);
  return catalog.tools;
}
async function home(page: Page) {
  const response = await page.goto('/');
  expect(response?.status(), 'Homepage HTTP response').toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // Controls can be visible before Astro attaches their React event handlers.
  await expect(page.locator('astro-island[client="load"][ssr]')).toHaveCount(0);
}
const search = (page: Page) => page.getByRole('textbox', { name: 'Search CLIs, commands, tasks, or GitHub repositories' });
const ripgrepRow = (page: Page) => page.locator('tbody tr').filter({ has: page.locator('a.table-project[href="/tools/ripgrep/"]') });

// Each test gets a fresh browser context. Never touch a signed-in browser or submit an issue.
test('homepage count, exact search, category filtering and phone layout', async ({ page, request }, testInfo) => {
  const tools = await readCatalog(request);
  await home(page);
  await expect(page.locator('.leaderboard-title > span')).toHaveText(`${tools.length} CLIs`);
  await expect(page.locator('tbody tr')).toHaveCount(tools.length);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), {
    message: 'Homepage must fit the viewport without horizontal scrolling',
  }).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('homepage.png') });
  await search(page).fill('ripgrep');
  await search(page).press('Enter');
  await expect(ripgrepRow(page)).toBeVisible();
  await expect(page.locator('tbody a.table-project[href="/tools/jq/"]')).toHaveCount(0);
  expect(await page.locator('tbody tr').count(), 'Search must exclude nonmatching CLIs').toBeLessThan(tools.length);
  await expect(page).toHaveURL(/q=ripgrep/);
  await expect(search(page)).toHaveValue('ripgrep');
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  const category = tools.find(tool => tool.slug === 'ripgrep')!.category;
  await page.getByRole('combobox', { name: 'Filter category' }).selectOption(category);
  await expect(page.locator('tbody tr')).toHaveCount(tools.filter(tool => tool.category === category).length);
  await expect(ripgrepRow(page)).toBeVisible();
});

test('tool details and saved CLI survive navigation and reload', async ({ page }) => {
  await home(page);
  await search(page).fill('ripgrep');
  await ripgrepRow(page).getByRole('button', { name: 'Save ripgrep', exact: true }).click();
  await expect(ripgrepRow(page).getByRole('button', { name: 'Unsave ripgrep', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await ripgrepRow(page).locator('a.table-project').click();
  await expect(page).toHaveURL(/\/tools\/ripgrep\/$/);
  await expect(page.getByRole('heading', { name: 'ripgrep', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'GitHub repository', exact: false })).toHaveAttribute('href', 'https://github.com/BurntSushi/ripgrep');
  await expect(page.getByRole('link', { name: 'Read documentation', exact: false })).toHaveAttribute('href', /^https:\/\//);
  await page.getByRole('link', { name: 'Saved CLIs', exact: true }).click();
  await expect(ripgrepRow(page)).toBeVisible();
  await page.reload();
  await expect(page.locator('astro-island[client="load"][ssr]')).toHaveCount(0);
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await ripgrepRow(page).getByRole('button', { name: 'Unsave ripgrep', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No saved CLIs match' })).toBeVisible();
});

test('submission opens and closes with keyboard and touch-sized controls', async ({ page }, testInfo) => {
  await home(page);
  const trigger = page.getByRole('button', { name: 'Submit your CLI', exact: true });
  await expect(trigger).toBeVisible();
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Submit your CLI' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: '1. GitHub repository' })).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: 'CLI name', exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Continue to GitHub' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('submission.png') });
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.press('Enter');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Close submission' }).click();
  await expect(dialog).not.toBeVisible();
});

test('agent endpoints, deployed version and missing-page response', async ({ request }) => {
  const tools = await readCatalog(request);
  for (const path of ['/llms.txt', '/llms-full.txt']) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()['content-type'], path).toContain('text/plain');
    const body = await response.text();
    expect(body, path).toContain('useclis');
    if (path === '/llms-full.txt') {
      expect(body).toContain('ripgrep');
      expect(body).toContain(`${tools.length} command-line tools`);
    } else {
      expect(body).toContain('/clis.json');
    }
  }
  const missing = await request.get('/useclis-smoke-missing-route/');
  expect(missing.status(), 'Unknown routes must return HTTP 404').toBe(404);
  expect(await missing.text()).toContain('useclis');
});

test('reviewed profiles expose useful workflows and copy the selected CLI prompt', async ({ page, context }, testInfo) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  for (const slug of ['ripgrep', 'agent-browser']) {
    const response = await page.goto(`/tools/${slug}/`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('astro-island[client="load"][ssr]')).toHaveCount(0);
    await expect(page.getByRole('heading', {name: 'Agent capabilities and setup'})).toBeVisible();
    const workflow = page.getByRole('region', {name: `${slug} workflow`});
    await expect(workflow.getByRole('heading', {name: 'Try a useful task'})).toBeVisible();
    await workflow.getByRole('button', {name: 'Copy prompt for this CLI'}).click();
    await expect(workflow.getByRole('status')).toHaveText('Prompt copied. Paste it into your agent.');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe(await workflow.locator('textarea').inputValue());
    expect(copied).toContain(slug);
    expect(copied).toContain('Do not install software, access credentials');
    expect(copied).toContain('not been execution-tested');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({path:testInfo.outputPath(`${slug}-workflow.png`),fullPage:true});
  }
});


test('Detail Save and Unsave persist with consistent Saved filter navigation', async ({page},testInfo) => {
  await home(page);
  await search(page).fill('ripgrep');
  await page.getByRole('combobox',{name:'Sort tools'}).selectOption('name');
  await page.getByRole('combobox',{name:'Download source'}).selectOption('npm');
  await ripgrepRow(page).locator('a.table-project').click();
  await expect(page.locator('astro-island[client="load"][ssr]')).toHaveCount(0);
  await page.getByRole('button',{name:'Save ripgrep',exact:true}).click();
  await expect(page.getByRole('button',{name:'Unsave ripgrep',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.reload();
  await expect(page.locator('astro-island[client="load"][ssr]')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Unsave ripgrep',exact:true})).toHaveAttribute('aria-pressed','true');
  const saveBounds = await page.getByRole('button',{name:'Unsave ripgrep',exact:true}).boundingBox();
  expect(saveBounds?.height).toBeLessThanOrEqual(56);
  expect(saveBounds?.height).toBeGreaterThanOrEqual((page.viewportSize()?.width ?? 1280) < 768 ? 44 : 38);
  await page.screenshot({path:testInfo.outputPath('detail-saved.png')});
  await page.getByRole('link',{name:'Saved CLIs',exact:true}).click();
  await expect(page.locator('astro-island[client="load"][ssr]')).toHaveCount(0);
  await expect(search(page)).toHaveValue('ripgrep');
  await expect(page.getByRole('combobox',{name:'Sort tools'})).toHaveValue('name');
  await expect(page.getByRole('combobox',{name:'Download source'})).toHaveValue('npm');
  await expect(ripgrepRow(page)).toBeVisible();
  await ripgrepRow(page).locator('a.table-project').click();
  await expect(page.locator('astro-island[client="load"][ssr]')).toHaveCount(0);
  await page.getByRole('button',{name:'Unsave ripgrep',exact:true}).click();
  await page.getByRole('link',{name:'Saved CLIs',exact:true}).click();
  await expect(page.getByRole('heading',{name:'No saved CLIs match',exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading',{name:'No saved CLIs match',exact:true})).toBeVisible();
});


test('Empty search offers broader catalog terms without claiming a task solution', async ({page}, testInfo) => {
  await home(page);
  await search(page).fill('pdf zxxwqqnotacli');
  await expect(page.locator('.empty-state')).toContainText('not verified solutions');
  await expect(search(page)).toHaveValue('pdf zxxwqqnotacli');
  await page.locator('.empty-state').scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath('empty-search-recovery.png')});
  await page.getByRole('link',{name:/Search “pdf”/}).click();
  await expect(page.locator('astro-island[client="load"][ssr]')).toHaveCount(0);
  await expect(search(page)).toHaveValue('pdf');
  expect(await page.locator('tbody tr').count()).toBeGreaterThan(0);
  await search(page).fill('zxxwqqnotacli');
  await expect(page.locator('.search-suggestions a')).toHaveCount(0);
  await expect(page.locator('.empty-state')).toContainText('may not be covered');
  await page.getByRole('button',{name:'Browse all CLIs',exact:true}).click();
  await expect(search(page)).toHaveValue('');
  expect(await page.locator('tbody tr').count()).toBeGreaterThan(0);
});

test('Source repository and contribution path are one click from the homepage', async ({page, request, baseURL}, testInfo) => {
  const source = 'https://github.com/jackwalkerlabs/useclis';
  await home(page);
  const footerSource = page.locator('footer.footer').getByRole('link', {name: 'Source on GitHub', exact: true});
  await expect(footerSource).toHaveAttribute('href', source);
  await expect(footerSource).toBeVisible();
  const headerSource = page.getByRole('navigation', {name: 'Main navigation'}).getByRole('link', {name: 'useclis source on GitHub'});
  // The smallest phones rely on the footer link; the header has room from 380px.
  if ((page.viewportSize()?.width ?? 1280) >= 380) {
    await expect(headerSource).toBeVisible();
    await expect(headerSource).toHaveAttribute('href', source);
  }
  await page.goto('/about/');
  const openSource = page.locator('#open-source ~ ul').first();
  const contributing = openSource.getByRole('link', {name: 'contributing guide'});
  const issues = openSource.getByRole('link', {name: 'issue tracker'});
  await expect(contributing).toHaveAttribute('href', `${source}/blob/main/CONTRIBUTING.md`);
  await expect(issues).toHaveAttribute('href', `${source}/issues`);
  await expect(openSource).toContainText('Submit your CLI');
  // A broken source or contribution destination must block deployment, but PR builds
  // should not depend on github.com availability: check once, against production only.
  if (testInfo.project.name !== 'desktop' || /127\.0\.0\.1|localhost/.test(baseURL ?? '')) return;
  for (const url of [source, `${source}/blob/main/CONTRIBUTING.md`, `${source}/issues`]) {
    await expect.poll(async () => (await request.get(url, {timeout: 15_000}).catch(() => null))?.status(), {
      message: url, intervals: [2_000, 5_000, 10_000], timeout: 40_000,
    }).toBe(200);
  }
});

test('Narrow-tablet header keeps the source link on one row without overflow', async ({page}) => {
  for (const width of [761, 800, 900]) {
    await page.setViewportSize({width, height: 900});
    await home(page);
    const header = page.locator('header.header');
    await expect(page.getByRole('navigation', {name: 'Main navigation'}).getByRole('link', {name: 'useclis source on GitHub'})).toBeVisible();
    expect((await header.boundingBox())?.height, `${width}px header height`).toBeLessThanOrEqual(61);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}px overflow`).toBe(true);
  }
});

test('share metadata and preview image are complete on home and tool pages', async ({ page, request }) => {
  const descriptions: string[] = [];
  for (const path of ['/', '/tools/ripgrep/']) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    const meta = (key: string) => page.locator(`head meta[property="${key}"], head meta[name="${key}"]`).first().getAttribute('content');
    const title = await page.title();
    expect(await meta('og:title'), path).toBe(title);
    expect(await meta('twitter:title'), path).toBe(title);
    const description = await meta('description');
    expect(description, path).toBeTruthy();
    descriptions.push(description!);
    expect(await meta('og:description'), path).toBe(description);
    expect(await meta('twitter:description'), path).toBe(description);
    expect(await meta('twitter:card'), path).toBe('summary_large_image');
    const url = new URL((await meta('og:url'))!);
    expect(url.protocol, path).toBe('https:');
    expect(url.pathname, path).toBe(path);
    const canonical = await page.locator('head link[rel="canonical"]').getAttribute('href');
    if (canonical) expect(canonical, path).toBe(url.href);
    const image = new URL((await meta('og:image'))!);
    expect(image.protocol, path).toBe('https:');
    expect(await meta('twitter:image'), path).toBe(image.href);
    expect(await meta('og:image:width'), path).toBe('1200');
    expect(await meta('og:image:height'), path).toBe('630');
    expect((await meta('og:image:alt'))?.length, path).toBeGreaterThan(20);
    // Fetch from the deployment under test; the tag itself names the production host.
    const png = await request.get(image.pathname);
    expect(png.status(), image.pathname).toBe(200);
    expect(png.headers()['content-type']).toContain(await meta('og:image:type'));
    const bytes = await png.body();
    expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], 'PNG dimensions').toEqual([1200, 630]);
  }
  expect(descriptions[1], 'Tool pages override the shared description').not.toBe(descriptions[0]);
  // og:type=profile describes a person; organizations remain websites.
  for (const [path, type] of [['/github/burntsushi/', 'profile'], ['/github/jqlang/', 'website']]) {
    expect((await page.goto(path))?.status(), path).toBe(200);
    await expect(page.locator('head meta[property="og:type"]'), path).toHaveAttribute('content', type);
  }
});

// Public agent API contract (docs/AGENT-API.md): every surface must be complete,
// parseable, mutually consistent, and able to resolve a known task without the UI.
test('agent API surfaces are complete, parseable and resolve a known task', async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'HTTP-only contract; one viewport is enough');
  const { agentSurfaces, findToolsForTask, jsonExtractionFixture, validateAgentApi } = await import('../../scripts/lib/agent-api-contract.mjs');
  const bodies: Record<string, string> = {};
  for (const { path, contentType } of agentSurfaces) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()['content-type'], path).toContain(contentType);
    bodies[path] = await response.text();
    expect(bodies[path].length, `${path} must not be empty`).toBeGreaterThan(200);
  }
  const { errors, catalog } = validateAgentApi({
    guide: bodies['/llms.txt'], full: bodies['/llms-full.txt'], json: bodies['/clis.json'],
    siteUrl: process.env.SMOKE_SITE_URL || 'https://useclis.com',
  });
  expect(errors).toEqual([]);
  expect(findToolsForTask(catalog, jsonExtractionFixture.task)[0]?.slug).toBe(jsonExtractionFixture.expectedSlug);
});

test('GitHub stars heading reverses to ascending order and back', async ({page}) => {
  await home(page);
  const header = page.getByRole('columnheader', {name: /GitHub stars/});
  const starCounts = async () => (await page.locator('tbody .table-stars').allTextContents()).slice(0, 5).map(text => Number(text.replace(/,/g, '')));
  await header.getByRole('button').click();
  await expect(header).toHaveAttribute('aria-sort', 'ascending');
  await expect(page).toHaveURL(/sort=stars&order=asc/);
  const ascending = await starCounts();
  expect(ascending).toEqual([...ascending].sort((a, b) => a - b));
  await header.getByRole('button').press('Enter');
  await expect(header).toHaveAttribute('aria-sort', 'descending');
  const descending = await starCounts();
  expect(descending).toEqual([...descending].sort((a, b) => b - a));
});

test('Discovery card metric labels stay separated at tablet and phone widths', async ({page}) => {
  for (const width of [768, 900, 390]) {
    await page.setViewportSize({width, height: 1024});
    await home(page);
    // Measure rendered label text, not grid cells, so touching labels fail even when cells do not overlap.
    const gaps = await page.evaluate(() => [...document.querySelectorAll('.discovery-metrics')].flatMap(list => {
      const boxes = [...list.querySelectorAll('dt')].map(label => {
        const range = document.createRange();
        range.selectNodeContents(label);
        return range.getBoundingClientRect();
      });
      return boxes.slice(1).map((box, index) => Math.abs(box.top - boxes[index].top) > 2 ? Infinity : box.left - boxes[index].right);
    }));
    expect(gaps.length, `${width}px discovery cards`).toBeGreaterThan(0);
    expect(Math.min(...gaps), `${width}px metric label gap`).toBeGreaterThanOrEqual(8);
  }
});

test('Reviewed tool profiles lead with task fit and explained alternatives before statistics', async ({page}) => {
  for (const slug of ['ripgrep', 'agent-browser']) {
    const response = await page.goto(`/tools/${slug}/`);
    expect(response?.status()).toBe(200);
    const fit = page.getByRole('region', {name: /right tool\?$/});
    await expect(fit).toBeVisible();
    await expect(fit.getByText('Best for', {exact: true})).toBeVisible();
    await expect(fit.getByText('Look elsewhere when', {exact: true})).toBeVisible();
    expect(await fit.locator('.task-fit-alternatives li').count()).toBeGreaterThanOrEqual(2);
    await expect(fit.getByRole('link', {name: 'Try a documented task below'})).toHaveAttribute('href', '#tool-workflow');
    await expect(page.locator('#tool-workflow')).toHaveCount(1);
    const [fitTop, statsTop, activityTop] = await page.evaluate(() => ['.task-fit', '.stars-panel', '#activity'].map(selector => document.querySelector(selector)!.getBoundingClientRect().top));
    expect(fitTop, 'task fit precedes repository activity').toBeLessThan(activityTop);
    // Desktop shows statistics in a side column; on phones the stack must lead with task fit.
    if ((page.viewportSize()?.width ?? 1280) <= 760) expect(fitTop, 'task fit precedes stars on phones').toBeLessThan(statsTop);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
});
