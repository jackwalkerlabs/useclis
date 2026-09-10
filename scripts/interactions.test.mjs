import assert from 'node:assert/strict';
import { after, afterEach, beforeEach, test, mock } from 'node:test';
import { JSDOM } from 'jsdom';

// Component tests only: no browser process, layout engine, or user profile access.
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:4321/' });
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'localStorage', 'MutationObserver']) {
  Object.defineProperty(globalThis, key, { value: key === 'window' ? dom.window : dom.window[key], configurable: true });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createElement: h } = await import('react');
const { render, cleanup, screen, fireEvent, act } = await import('@testing-library/react');
const { default: userEvent } = await import('@testing-library/user-event');
const { default: Directory } = await import('../src/components/Directory.tsx');
const { default: ActivityChart } = await import('../src/components/ActivityChart.tsx');
const { default: StarsPanel } = await import('../src/components/StarsPanel.tsx');
const { default: CommandExample } = await import('../src/components/CommandExample.tsx');
const { default: AgentPrompt } = await import('../src/components/AgentPrompt.tsx');
const { agentPrompt } = await import('../src/lib/agent-prompt.ts');
const { tools, categories } = await import('../src/data/tools.ts');
const { default: activity } = await import('../src/data/activity.json', { with: { type: 'json' } });
let scrolls;
beforeEach(() => {
  window.history.replaceState(null, '', '/');
  localStorage.clear();
  scrolls = [];
  window.HTMLElement.prototype.scrollIntoView = function () { scrolls.push(this.id); };
});
afterEach(() => { cleanup(); mock.restoreAll(); });
after(() => dom.window.close());
const rows = () => [...document.querySelectorAll('tbody .table-project strong')].map(node => node.textContent);
const search = () => screen.getByRole('textbox', { name: /Search CLIs/ });

test('Agent prompt copies exactly and opens a selected fallback when clipboard access fails', async () => {
  const user = userEvent.setup();
  let copied;
  mock.method(navigator.clipboard, 'writeText', async value => { copied = value; });
  render(h(AgentPrompt, { siteUrl: 'https://directory.example/' }));
  await user.click(screen.getByRole('button', { name: 'Copy agent prompt' }));
  assert.equal(copied, agentPrompt('https://directory.example/'));
  assert.match(screen.getByRole('status').textContent, /Prompt copied/);
  mock.method(navigator.clipboard, 'writeText', async () => { throw new Error('Clipboard denied'); });
  await user.click(screen.getByRole('button', { name: 'Copy agent prompt' }));
  const prompt = screen.getByRole('textbox', { name: 'Agent prompt' });
  assert.ok(prompt.closest('details').open);
  assert.equal(document.activeElement, prompt);
  assert.equal(prompt.selectionStart, 0);
  assert.equal(prompt.selectionEnd, prompt.value.length);
  assert.equal(prompt.value, copied);
  assert.match(screen.getByRole('status').textContent, /Copy the selected prompt/);
});

test('Rebrand preserves old bookmarks and saves subsequent removals under useclis', async () => {
  localStorage.setItem('openrepo-saved', JSON.stringify(['github-cli', 'removed-project']));
  window.history.replaceState(null, '', '/?saved=1');
  const first = render(h(Directory, { tools }));
  assert.deepEqual(rows(), ['GitHub CLI']);
  assert.deepEqual(JSON.parse(localStorage.getItem('useclis-saved')), ['github-cli']);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Unsave GitHub CLI', exact: true }));
  first.unmount();
  render(h(Directory, { tools }));
  assert.deepEqual(rows(), [], 'An empty current list must not resurrect legacy bookmarks');
});

test('Current useclis bookmarks take precedence over legacy bookmarks', () => {
  localStorage.setItem('openrepo-saved', JSON.stringify(['github-cli']));
  localStorage.setItem('useclis-saved', JSON.stringify(['ripgrep']));
  window.history.replaceState(null, '', '/?saved=1');
  render(h(Directory, { tools }));
  assert.deepEqual(rows(), ['ripgrep']);
});

test('Search, Explore, Enter, clear search, empty results, and Browse all work', async () => {
  const user = userEvent.setup();
  render(h(Directory, { tools }));
  assert.equal(rows().length, tools.length);
  await user.type(search(), 'cli/cli');
  assert.deepEqual(new Set(rows()), new Set(['GitHub CLI', 'Salesforce CLI (sf)']));
  await user.click(screen.getByRole('button', { name: 'Explore' }));
  assert.deepEqual(scrolls, ['directory']);
  await user.click(search());
  await user.keyboard('{Enter}');
  assert.equal(scrolls.length, 2, 'Enter should submit the search and reach results');
  await user.click(screen.getByRole('button', { name: 'Clear search' }));
  assert.equal(rows().length, tools.length);
  await user.type(search(), 'no-such-cli-928273');
  assert.ok(screen.getByRole('heading', { name: 'No CLIs found' }));
  await user.click(screen.getByRole('button', { name: 'Browse all CLIs' }));
  assert.equal(rows().length, tools.length);
});

test('Every category, all sort options, star header, and Clear filters work', async () => {
  const user = userEvent.setup();
  render(h(Directory, { tools }));
  for (const category of categories) {
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter category' }), category);
    assert.deepEqual(new Set(rows()), new Set(tools.filter(tool => tool.category === category).map(tool => tool.name)));
    assert.equal(new URLSearchParams(window.location.search).get('category'), category);
  }
  await user.click(screen.getByRole('button', { name: 'Clear filters' }));
  await user.selectOptions(screen.getByRole('combobox', { name: 'Sort tools' }), 'name');
  assert.deepEqual(rows(), tools.map(tool => tool.name).sort((a, b) => a.localeCompare(b)));
  await user.selectOptions(screen.getByRole('combobox', { name: 'Sort tools' }), 'featured');
  assert.deepEqual(new Set(rows().slice(0, 4)), new Set(tools.filter(tool => tool.featured).map(tool => tool.name)));
  await user.click(screen.getByRole('button', { name: 'GitHub stars' }));
  assert.deepEqual(rows(), [...tools].sort((a, b) => b.stars - a.stars).map(tool => tool.name));
});

test('Discovery links clear filters, sort the full table, and survive reload and history', async () => {
  const user = userEvent.setup();
  window.history.replaceState(null, '', '/?q=jq&saved=1');
  const first = render(h(Directory, { tools }));
  await user.click(screen.getByRole('link', { name: 'View all recently listed' }));
  assert.equal(search().value, '');
  assert.equal(rows().length, tools.length);
  assert.equal(rows()[0], tools.at(-1).name);
  assert.equal(window.location.search, '?sort=recent');
  assert.deepEqual(scrolls, ['directory']);
  first.unmount();
  render(h(Directory, { tools }));
  assert.equal(screen.getByRole('combobox', { name: 'Sort tools' }).value, 'recent');
  assert.equal(rows()[0], tools.at(-1).name);
  await user.click(screen.getByRole('link', { name: 'View all most active this week' }));
  const highest = Math.max(...Object.values(activity).map(snapshot => snapshot.weeks.at(-1)));
  const topTool = tools.find(tool => tool.name === rows()[0]);
  assert.equal(activity[topTool.slug].weeks.at(-1), highest);
  assert.equal(window.location.search, '?sort=active');
  act(() => {
    window.history.replaceState(null, '', '/?sort=recent');
    window.dispatchEvent(new window.PopStateEvent('popstate'));
  });
  assert.equal(rows()[0], tools.at(-1).name);
});

test('All bookmark buttons persist, reload, filter, and remove their own CLI', async () => {
  const user = userEvent.setup();
  const first = render(h(Directory, { tools }));
  for (const tool of tools) {
    await user.click(screen.getByRole('button', { name: `Save ${tool.name}`, exact: true }));
    assert.equal(screen.getByRole('button', { name: `Unsave ${tool.name}`, exact: true }).getAttribute('aria-pressed'), 'true');
  }
  assert.equal(JSON.parse(localStorage.getItem('useclis-saved')).length, tools.length);
  first.unmount();
  window.history.replaceState(null, '', '/?saved=1');
  render(h(Directory, { tools }));
  assert.ok(screen.getByRole('heading', { name: 'Saved CLIs' }));
  for (const tool of tools) await user.click(screen.getByRole('button', { name: `Unsave ${tool.name}`, exact: true }));
  assert.deepEqual(rows(), []);
  assert.deepEqual(JSON.parse(localStorage.getItem('useclis-saved')), []);
  assert.ok(screen.getByRole('heading', { name: 'No saved CLIs match' }));
});

test('Saved shortcut clears other filters; corrupt and unavailable storage do not break buttons', async () => {
  const user = userEvent.setup();
  localStorage.setItem('useclis-saved', 'invalid json');
  render(h(Directory, { tools }));
  mock.method(window.Storage.prototype, 'setItem', () => { throw new Error('Storage denied'); });
  await user.click(screen.getByRole('button', { name: 'Save GitHub CLI', exact: true }));
  assert.match(screen.getByRole('status').textContent, /Saved for this visit/);
  await user.type(search(), 'nonmatching');
  await user.click(screen.getByRole('button', { name: 'Saved CLIs', exact: true }));
  assert.deepEqual(rows(), ['GitHub CLI']);
  assert.equal(search().value, '');
  assert.equal(scrolls.at(-1), 'directory');
});

test('Deep links restore category/search/saved/sort and ignore invalid saved IDs', () => {
  localStorage.setItem('useclis-saved', JSON.stringify(['jq', 'removed-cli', null, 99]));
  window.history.replaceState(null, '', '/?q=jq&saved=1&category=Data%20%26%20APIs&sort=name');
  render(h(Directory, { tools }));
  assert.deepEqual(rows(), ['jq']);
  assert.equal(search().value, 'jq');
  assert.equal(screen.getByRole('combobox', { name: 'Sort tools' }).value, 'name');
});

test('Browser history restores filters and the slash shortcut focuses only outside text inputs', async () => {
  const user = userEvent.setup();
  render(h(Directory, { tools }));
  await user.keyboard('/');
  assert.equal(document.activeElement, search());
  await user.type(search(), 'cli/cli');
  assert.equal(search().value, 'cli/cli');
  window.history.pushState(null, '', '/?q=ripgrep');
  act(() => window.dispatchEvent(new window.PopStateEvent('popstate')));
  assert.equal(search().value, 'ripgrep');
  assert.deepEqual(rows(), ['ripgrep']);
});

test('Every CLI activity chart range shows the corresponding real total', async () => {
  const user = userEvent.setup();
  for (const tool of tools) {
    const weeks = activity[tool.slug].weeks;
    const view = render(h(ActivityChart, { name: tool.name, weeks }));
    for (const [label, range] of [['12W', 12], ['26W', 26], ['1Y', 52]]) {
      await user.click(screen.getByRole('button', { name: label }));
      assert.equal(screen.getByRole('button', { name: label }).getAttribute('aria-pressed'), 'true');
      assert.ok(document.querySelector('.chart-total').textContent.startsWith(weeks.slice(-range).reduce((a, b) => a + b, 0).toLocaleString('en')));
    }
    view.unmount();
  }
});

function pointer(node, type, x) {
  const event = new window.MouseEvent(type, { bubbles: true, clientX: x, buttons: 1 });
  Object.defineProperty(event, 'pointerType', { value: 'touch' });
  fireEvent(node, event);
}

test('Activity supports tap, keyboard, blur, and changing range after inspection', async () => {
  const user = userEvent.setup();
  render(h(ActivityChart, { name: 'Fixture', weeks: Array.from({ length: 52 }, (_, i) => i + 1) }));
  const chart = screen.getByRole('img');
  chart.getBoundingClientRect = () => ({ left: 0, width: 640 });
  pointer(chart, 'pointerdown', 614);
  assert.match(document.querySelector('.chart-total').textContent, /^52 commits · 0 weeks/);
  fireEvent.keyDown(chart, { key: 'ArrowLeft' });
  assert.match(document.querySelector('.chart-total').textContent, /^51 commits · 1 weeks/);
  fireEvent.blur(chart);
  assert.match(document.querySelector('.chart-total').textContent, /commits over 12 weeks/);
  await user.click(screen.getByRole('button', { name: '1Y' }));
  assert.match(document.querySelector('.chart-total').textContent, /1,378 commits over 52 weeks/);
});

test('Stars keep pending history honest and inspect recorded points by touch and keyboard', () => {
  const props = { total: 110, points: [{ date: '2026-09-09', stars: 110 }], repo: 'example/cli', license: null, checkedAt: '2026-09-09' };
  const view = render(h(StarsPanel, props));
  assert.ok(screen.getByText('Star history starts Sep 9'));
  assert.equal(screen.queryByRole('img'), null);
  view.rerender(h(StarsPanel, { ...props, points: [{ date: '2026-09-08', stars: 100 }, ...props.points] }));
  const chart = screen.getByRole('img');
  chart.getBoundingClientRect = () => ({ left: 0, width: 380 });
  pointer(chart, 'pointerdown', 8);
  assert.equal(document.querySelector('.stars-panel-heading strong').textContent, '100');
  assert.equal(document.querySelector('.stars-period').textContent, 'Sep 8');
  fireEvent.keyDown(chart, { key: 'ArrowRight' });
  assert.equal(document.querySelector('.stars-panel-heading strong').textContent, '110');
  fireEvent.blur(chart);
  assert.equal(document.querySelector('.stars-period').textContent, 'Since Sep 8');
});

test('Every copy button copies its exact command; denied clipboard selects text for manual copying', async () => {
  const user = userEvent.setup();
  const copied = [];
  mock.method(navigator.clipboard, 'writeText', async text => { copied.push(text); });
  for (const tool of tools) {
    const view = render(h(CommandExample, { command: tool.example }));
    await user.click(screen.getByRole('button', { name: 'Copy example command' }));
    assert.equal(copied.at(-1), tool.example);
    assert.equal(screen.getByRole('status').textContent, 'Copied');
    view.unmount();
  }
  mock.method(navigator.clipboard, 'writeText', async () => { throw new Error('Permission denied'); });
  render(h(CommandExample, { command: 'gh repo view cli/cli --json name' }));
  await user.click(screen.getByRole('button', { name: 'Copy example command' }));
  assert.equal(window.getSelection().toString(), 'gh repo view cli/cli --json name');
  assert.equal(screen.getByRole('status').textContent, 'Select and copy the command');
});

test('Submission modal preserves details when closed and validates repository URLs', async () => {
  const { default: SubmitCLI } = await import('../src/components/SubmitCLI.tsx');
  Object.defineProperty(window.HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function () { this.setAttribute('open', ''); } });
  Object.defineProperty(window.HTMLDialogElement.prototype, 'close', { configurable: true, value: function () { this.removeAttribute('open'); } });
  const previousFormData = globalThis.FormData;
  globalThis.FormData = window.FormData;
  try {
    const user = userEvent.setup();
    render(h(SubmitCLI));
    const trigger = screen.getByRole('button', { name: 'Submit your CLI' });
    await user.click(trigger);
    assert.equal(document.body.style.overflow, 'hidden');
    const repo = screen.getByLabelText('1. GitHub repository');
    await user.type(repo, 'https://example.com/owner/cli');
    fireEvent.submit(document.querySelector('.submission-form'));
    assert.match(repo.validationMessage, /Enter a GitHub repository URL/);
    await user.clear(repo);
    await user.type(repo, 'https://github.com/owner/cli');
    assert.equal(repo.validationMessage, '');
    await user.click(screen.getByRole('button', { name: 'Close submission' }));
    assert.equal(document.body.style.overflow, '');
    assert.equal(document.activeElement, trigger);
    await user.click(trigger);
    assert.equal(screen.getByLabelText('1. GitHub repository').value, 'https://github.com/owner/cli');
    fireEvent(document.querySelector('dialog'), new window.Event('cancel', { cancelable: true }));
    assert.equal(document.querySelector('dialog').open, false);
  } finally { globalThis.FormData = previousFormData; }
});

const { default: ProfileActivityChart } = await import('../src/components/ProfileActivityChart.tsx');
const { default: ShareProfile } = await import('../src/components/ShareProfile.tsx');

test('Profile chart ranges, keyboard and touch inspection use dated totals', async () => {
  const user = userEvent.setup();
  const points = Array.from({ length: 52 }, (_, index) => ({ date: new Date(Date.UTC(2025, 8, 14) + index * 7 * 86400000).toISOString().slice(0, 10), commits: index + 1 }));
  render(h(ProfileActivityChart, { points, name: 'Owner', repositories: 2, totalRepositories: 2 }));
  for (const range of [12, 26, 52]) {
    await user.selectOptions(screen.getByRole('combobox', { name: 'Activity period' }), String(range));
    assert.equal(document.querySelector('.profile-chart-heading strong').textContent, points.slice(-range).reduce((sum, point) => sum + point.commits, 0).toLocaleString('en'));
  }
  const chart = screen.getByRole('img');
  chart.getBoundingClientRect = () => ({ left: 0, width: 960 });
  pointer(chart, 'pointerdown', 928);
  assert.match(screen.getByRole('status').textContent, /52 commits/);
  fireEvent.keyDown(chart, { key: 'ArrowLeft' });
  assert.match(screen.getByRole('status').textContent, /51 commits/);
  fireEvent.keyDown(chart, { key: 'Escape' });
  assert.equal(screen.getByRole('status').textContent, '');
  await user.selectOptions(screen.getByRole('combobox', { name: 'Activity period' }), '12');
  assert.equal(document.querySelector('.profile-chart-tooltip'), null);
});

test('Profile chart has a truthful empty state without invalid SVG coordinates', () => {
  render(h(ProfileActivityChart, { points: [], name: 'Owner', repositories: 0, totalRepositories: 2 }));
  assert.ok(screen.getByText('Weekly activity is not available yet.'));
  assert.equal(screen.queryByRole('img'), null);
});

test('Share copies the profile URL and offers a selectable link if clipboard fails', async () => {
  const user = userEvent.setup();
  window.history.replaceState(null, '', '/github/sharkdp/?ignored=1#test');
  const copied = [];
  mock.method(navigator.clipboard, 'writeText', async text => copied.push(text));
  render(h(ShareProfile));
  await user.click(screen.getByRole('button', { name: 'Share' }));
  assert.deepEqual(copied, ['http://localhost:4321/github/sharkdp/']);
  assert.equal(screen.getByRole('status').textContent, 'Link copied');
  mock.method(navigator.clipboard, 'writeText', async () => { throw new Error('Denied'); });
  await user.click(screen.getByRole('button', { name: 'Share' }));
  const input = screen.getByRole('textbox', { name: 'Profile link' });
  assert.equal(input.value, copied[0]);
  await user.click(input);
  assert.equal(input.selectionEnd - input.selectionStart, copied[0].length);
});
