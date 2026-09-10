/** An omitted selection means the normal daily refresh; [] deliberately does no work. */
export function selectRefreshEntries(entries, selection = process.env.REFRESH_SLUGS, key = entry => entry.slug) {
  if (selection === undefined) return entries;
  const slugs = JSON.parse(selection);
  if (!Array.isArray(slugs) || slugs.some(slug => typeof slug !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) || new Set(slugs).size !== slugs.length) {
    throw new Error('REFRESH_SLUGS must be a JSON array of unique catalog slugs');
  }
  const selected = new Set(slugs);
  return entries.filter(entry => selected.has(key(entry)));
}
