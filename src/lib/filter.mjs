const normalize = value => (value ?? '').toLowerCase().trim().replace(/\s+/g, ' ');

// Only repository roots are aliases: never reinterpret another host, credentials,
// a port, or a GitHub issue/file URL as a repository search.
export function repositoryQuery(query) {
  const value = normalize(query);
  const match = value.match(/^(?:(?:https?:\/\/)?(?:www\.)?github\.com\/)?([a-z\d-]+)\/([a-z\d._-]+)\/?(?:[?#][^\s]*)?$/);
  if (!match) return null;
  const repo = match[2].replace(/\.git$/, '');
  return repo && repo !== '.' && repo !== '..' ? `${match[1]}/${repo}` : null;
}

const containsWords = (text, words) => words.every(word => {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, 'u').test(normalize(text));
});

/** Match evidence comes only from existing catalog fields, with no inferred capabilities. */
export function searchMatch(tool, query) {
  const value = normalize(query);
  if (!value) return { score: 0, reason: '' };
  const repo = repositoryQuery(value);
  if (repo) return normalize(tool.repo) === repo ? { score: 100, reason: `Repository: ${tool.repo}` } : null;
  if (/^(?:[a-z][a-z\d+.-]*:\/\/|(?:www\.)?github\.com\/)/.test(value)) return null;
  for (const [field, label] of [['command', 'Command'], ['name', 'Name'], ['sourceListName', 'Source name'], ['repo', 'Repository']]) {
    if (normalize(tool[field]) === value) return { score: 100, reason: `${label}: ${tool[field]}` };
  }
  const words = value.split(' ');
  // Do not assemble an apparent task from unrelated fields, or treat a broad
  // category (e.g. Code search) as evidence that every member searches code.
  for (const [field, label, score] of [
    ['command', 'Command', 80], ['name', 'Name', 80], ['sourceListName', 'Source name', 80], ['repo', 'Repository', 80],
    ['useCase', 'Task', 60], ['description', 'Description', 40], ['agentUse', 'Agent use', 30],
  ]) {
    if (containsWords(tool[field], words)) return { score: Number(score), reason: `${label}: ${tool[field]}` };
  }
  const feature = tool.features?.find(feature => containsWords(feature, words));
  if (feature) return { score: 20, reason: `Feature: ${feature}` };
  if (normalize(tool.category) === value || (words.length === 1 && containsWords(tool.category, words))) {
    return { score: 10, reason: `Category: ${tool.category}` };
  }
  return null;
}

/** @param {any[]} tools @param {{query?: string, category?: string, sort?: string, onlySaved?: boolean, saved?: string[]}} [options] */
export function filterTools(tools, { query = '', category = 'All categories', sort, onlySaved = false, saved = [] } = {}) {
  const searching = Boolean(normalize(query));
  const ordering = sort ?? (searching ? 'relevance' : 'featured');
  const matches = new Map();
  return tools.filter(tool => {
    if ((category !== 'All categories' && tool.category !== category) || (onlySaved && !saved.includes(tool.slug))) return false;
    const match = searchMatch(tool, query);
    if (!match) return false;
    matches.set(tool, match.score);
    return true;
  }).sort((a, b) => {
    if (ordering === 'relevance') return (matches.get(b) - matches.get(a)) || (b.stars ?? 0) - (a.stars ?? 0) || a.name.localeCompare(b.name);
    if (ordering === 'recent') return (b.listedOrder ?? 0) - (a.listedOrder ?? 0);
    if (ordering === 'active') return (b.weeklyCommits ?? -1) - (a.weeklyCommits ?? -1) || (b.stars ?? 0) - (a.stars ?? 0);
    if (['npm', 'pypi', 'github'].includes(ordering)) {
      const metric = tool => ordering === 'github' ? tool.downloads?.github?.total : tool.downloads?.[ordering]?.counts?.['30d'];
      return (metric(b) ?? -1) - (metric(a) ?? -1) || a.name.localeCompare(b.name);
    }
    if (ordering === 'homebrew') return (b.homebrew?.counts['30d'] ?? -1) - (a.homebrew?.counts['30d'] ?? -1) || a.name.localeCompare(b.name);
    return ordering === 'stars' ? (b.stars ?? 0) - (a.stars ?? 0) : ordering === 'name' ? a.name.localeCompare(b.name) : Number(Boolean(b.featured)) - Number(Boolean(a.featured));
  });
}
