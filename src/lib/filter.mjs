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

const metrics = {
  stars: tool => tool.stars,
  homebrew: tool => tool.homebrew?.counts?.['30d'],
  npm: tool => tool.downloads?.npm?.counts?.['30d'],
  pypi: tool => tool.downloads?.pypi?.counts?.['30d'],
  github: tool => tool.downloads?.github?.total,
};
/** Sorts that can run in either direction; every other sort has one fixed order. */
export const numericSorts = Object.keys(metrics);

/** @param {any[]} tools @param {{query?: string, category?: string, sort?: string, direction?: 'asc' | 'desc', onlySaved?: boolean, saved?: string[]}} [options] */
export function filterTools(tools, { query = '', category = 'All categories', sort, direction = 'desc', onlySaved = false, saved = [] } = {}) {
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
    if (Object.hasOwn(metrics, ordering)) {
      const value = tool => { const count = metrics[ordering](tool); return typeof count === 'number' ? count : null; };
      const [first, second] = [value(a), value(b)];
      // Download ties read alphabetically; star ties keep catalog order.
      const tie = () => ordering === 'stars' ? 0 : a.name.localeCompare(b.name);
      // Unavailable data is never zero: it follows every known count in both directions.
      if (first === null || second === null) return Number(first === null) - Number(second === null) || tie();
      return (direction === 'asc' ? first - second : second - first) || tie();
    }
    return ordering === 'name' ? a.name.localeCompare(b.name) : Number(Boolean(b.featured)) - Number(Boolean(a.featured));
  });
}
