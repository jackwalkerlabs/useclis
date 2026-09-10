import catalog from './catalog.json';
import repositories from './repositories.json';
import sourceList from './cli-source-list.json';
import homebrewMappings from './homebrew-mappings.json';
import homebrewSnapshots from './homebrew.json';
import activity from './activity.json';
import downloadMappings from './download-mappings.json';
import downloadSnapshots from './downloads.json';
import { mappingIdentity, type DownloadSnapshot } from '../lib/downloads.mjs';
const packageMappings = downloadMappings as Record<string, any>;
const packageSnapshots = downloadSnapshots as Record<string, Record<string, DownloadSnapshot>>;
import type { HomebrewMapping, HomebrewSnapshot } from '../lib/homebrew.mjs';
const brewMappings: Record<string, HomebrewMapping> = homebrewMappings;
const brewSnapshots = homebrewSnapshots as Record<string, HomebrewSnapshot>;
export const categories = ['Agents & models', 'Browser automation', 'Git & collaboration', 'Code search', 'Data & APIs', 'Cloud & deployment', 'Packages & environments', 'Testing & quality', 'Files & documents', 'Productivity & communication', 'Security & secrets'];
const sourceByRepo = new Map(sourceList.map(row => [row.github_url.toLowerCase(), row]));
// Catalog entries are appended when listed; preserve that order for discovery.
export const tools = catalog.map((tool, listedOrder) => {
  const source = sourceByRepo.get(`https://github.com/${tool.repo}`.toLowerCase());
  const mapping = brewMappings[tool.slug]?.repo === tool.repo ? brewMappings[tool.slug] : null;
  const snapshot = brewSnapshots[tool.slug];
  return {
    ...tool,
    downloads: Object.fromEntries(Object.entries(packageSnapshots[tool.slug] ?? {}).filter(([source, snapshot]) => packageMappings[tool.slug]?.repo === tool.repo && packageMappings[tool.slug]?.[source] && snapshot.identity === mappingIdentity(source, packageMappings[tool.slug]))) as Record<string, DownloadSnapshot>,
    featured: 'featured' in tool && tool.featured === true,
    ...repositories[tool.slug as keyof typeof repositories],
    listedOrder,
    weeklyCommits: activity[tool.slug as keyof typeof activity]?.weeks.at(-1) ?? null,
    logo: `/logos/${tool.slug}.png`,
    sourceListName: source?.cli_name ?? null,
    agentWorkflowSupport: source?.agent_ai_workflow_support ?? null,
    homebrewFormula: mapping?.formula ?? null,
    homebrew: mapping && snapshot?.repo === tool.repo && snapshot.formula === mapping.formula ? snapshot : null,
  };
});
export type Tool = typeof tools[number];
export const number = (value: number | null | undefined) => value == null ? '—' : new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
