import catalog from './catalog.json';
import repositories from './repositories.json';
import sourceList from './cli-source-list.json';
export const categories = ['Agents & models', 'Browser automation', 'Git & collaboration', 'Code search', 'Data & APIs', 'Cloud & deployment', 'Packages & environments', 'Testing & quality', 'Files & documents', 'Productivity & communication', 'Security & secrets'];
const sourceByRepo = new Map(sourceList.map(row => [row.github_url.toLowerCase(), row]));
export const tools = catalog.map(tool => {
  const source = sourceByRepo.get(`https://github.com/${tool.repo}`.toLowerCase());
  return {
    ...tool,
    featured: 'featured' in tool && tool.featured === true,
    ...repositories[tool.slug as keyof typeof repositories],
    logo: `/logos/${tool.slug}.png`,
    sourceListName: source?.cli_name ?? null,
    agentWorkflowSupport: source?.agent_ai_workflow_support ?? null,
  };
});
export type Tool = typeof tools[number];
export const number = (value: number | null | undefined) => value == null ? '—' : new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
