import type { Tool } from '../data/tools';

// Task wording is ours; tool, command and docs come from the catalog record.
// `evidence` must appear in the record's example so the task cannot silently drift
// from the command shown beside it.
export const homepageExamples = [
  { task: 'Read the package name from package.json', slug: 'jq', evidence: '.name' },
  { task: 'Find every TODO in the source tree', slug: 'ripgrep', evidence: 'TODO' },
  { task: 'Capture a screenshot of a web page', slug: 'shot-scraper', evidence: 'https://' },
] as const;

export type HomepageExample = { task: string; tool: Tool };

export function resolveHomepageExamples(tools: Tool[]): HomepageExample[] {
  return homepageExamples.flatMap(({ task, slug, evidence }) => {
    const tool = tools.find(candidate => candidate.slug === slug);
    return tool?.example?.includes(evidence) && tool.docs ? [{ task, tool }] : [];
  });
}
