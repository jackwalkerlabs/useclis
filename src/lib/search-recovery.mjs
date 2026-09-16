import { filterTools, repositoryQuery } from './filter.mjs';
const stopWords = new Set(['a','an','the','to','from','with','and','or','for','of','in','on','my','some','use','using','convert','create','make','find','get']);
// These links broaden a query; they never assert a tool can perform the full task.
export function searchRecovery(tools, query) {
  if (!query.trim() || repositoryQuery(query) || /:\/\/|github\.com\//i.test(query)) return [];
  const terms = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu) ?? [])]
    .filter(term => term.length > 1 && !stopWords.has(term) && term !== query.trim().toLowerCase()).slice(0, 20);
  return terms.map(term => ({ query: term, count: filterTools(tools, {query: term}).length }))
    .filter(item => item.count > 0).sort((a,b) => a.count-b.count || a.query.localeCompare(b.query)).slice(0,3);
}
