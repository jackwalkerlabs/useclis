/** @param {any[]} tools @param {{query?: string, category?: string, sort?: string, onlySaved?: boolean, saved?: string[]}} [options] */
export function filterTools(tools, { query = '', category = 'All categories', sort = 'featured', onlySaved = false, saved = [] } = {}) {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return tools.filter(tool => {
    const text = [tool.name, tool.sourceListName, tool.description, tool.category, tool.repo, tool.command, tool.useCase, tool.agentUse, ...(tool.features ?? [])].join(' ').toLocaleLowerCase();
    return words.every(word => text.includes(word)) && (category === 'All categories' || tool.category === category) && (!onlySaved || saved.includes(tool.slug));
  }).sort((a, b) => {
    if (sort === 'recent') return (b.listedOrder ?? 0) - (a.listedOrder ?? 0);
    if (sort === 'active') return (b.weeklyCommits ?? -1) - (a.weeklyCommits ?? -1) || (b.stars ?? 0) - (a.stars ?? 0);
    if (['npm', 'pypi', 'github'].includes(sort)) {
      const metric = tool => sort === 'github' ? tool.downloads?.github?.total : tool.downloads?.[sort]?.counts?.['30d'];
      return (metric(b) ?? -1) - (metric(a) ?? -1) || a.name.localeCompare(b.name);
    }
    if (sort === 'homebrew') return (b.homebrew?.counts['30d'] ?? -1) - (a.homebrew?.counts['30d'] ?? -1) || a.name.localeCompare(b.name);
    return sort === 'stars' ? (b.stars ?? 0) - (a.stars ?? 0) : sort === 'name' ? a.name.localeCompare(b.name) : Number(Boolean(b.featured)) - Number(Boolean(a.featured));
  });
}
