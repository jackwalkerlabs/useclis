import type { Tool } from '../data/tools';

// Task wording is ours; tool, command and docs come from the catalog record.
// `evidence` must appear in the record's example so the task cannot silently drift
// from the command shown beside it.
export const homepageExamples = [
  { label: 'PDF → Markdown', task: 'Turn this PDF into Markdown I can read', slug: 'markitdown', evidence: '.pdf' },
  { label: 'Screenshot a page', task: 'Capture a screenshot of a web page', slug: 'shot-scraper', evidence: 'https://' },
  { label: 'Inspect pods', task: 'List our Kubernetes pods as JSON', slug: 'kubectl', evidence: 'pods -o json' },
  { label: 'Find an issue', task: 'Find the Linear issue about the login bug', slug: 'linear-cli', evidence: '--search' },
  { label: 'Read JSON', task: 'Read the package name from package.json', slug: 'jq', evidence: '.name' },
] as const;

export type HomepageExample = { label: string; task: string; tool: Tool };

export function resolveHomepageExamples(tools: Tool[]): HomepageExample[] {
  return homepageExamples.flatMap(({ label, task, slug, evidence }) => {
    const tool = tools.find(candidate => candidate.slug === slug);
    return tool?.example?.includes(evidence) && tool.docs ? [{ label, task, tool }] : [];
  });
}
