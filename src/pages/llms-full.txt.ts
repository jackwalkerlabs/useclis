import type { APIRoute } from 'astro';
import { agentCatalogMarkdown } from '../lib/agent-catalog';

export const GET: APIRoute = ({ site }) => new Response(agentCatalogMarkdown(site), {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});
