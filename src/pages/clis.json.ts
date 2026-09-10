import type { APIRoute } from 'astro';
import { agentCatalog } from '../lib/agent-catalog';

export const GET: APIRoute = ({ site }) => new Response(JSON.stringify(agentCatalog(site), null, 2) + '\n', {
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
});
