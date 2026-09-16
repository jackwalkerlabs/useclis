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
