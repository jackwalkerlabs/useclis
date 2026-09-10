import catalog from './catalog.json';
import repositories from './repositories.json';
export const categories = ['Agents & models', 'Browser automation', 'Git & collaboration', 'Code search', 'Data & APIs', 'Cloud & deployment', 'Packages & environments', 'Testing & quality', 'Files & documents'];
export const tools = catalog.map(tool => ({ ...tool, featured: 'featured' in tool && tool.featured === true, ...repositories[tool.slug as keyof typeof repositories], logo: `/logos/${tool.slug}.png` }));
export type Tool = typeof tools[number];
export const number = (value: number | null | undefined) => value == null ? '—' : new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
