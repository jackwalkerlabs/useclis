import { request, type FullConfig } from '@playwright/test';
import { setTimeout } from 'node:timers/promises';

// A serial gate runs before any project loads the catalog or exercises controls.
// Otherwise one parallel test can see the new version after other flows passed
// against the old release during edge propagation.
export default async function preflight(config: FullConfig) {
  const expected = process.env.SMOKE_EXPECTED_SHA;
  if (!expected) return;
  const api = await request.newContext({ baseURL: config.projects[0].use.baseURL, timeout: 10_000 });
  const deadline = Date.now() + 30_000;
  let observed = 'No build response';
  try {
    do {
      try {
        const response = await api.get('/build-info.json');
        if (response.ok()) {
          const build = await response.json();
          observed = `commit ${build.commit}`;
          if (build.commit === expected) {
            const catalog = await api.get('/clis.json');
            if (catalog.ok() && (await catalog.json()).tools.length === build.catalogCount) return;
            observed += ', but catalog count differs';
          }
        } else observed = `HTTP ${response.status()}`;
      } catch (error) { observed = String(error); }
      await setTimeout(1_000);
    } while (Date.now() < deadline);
    throw new Error(`Deployment preflight expected ${expected}; observed ${observed}. Browser smoke tests did not start.`);
  } finally {
    await api.dispose();
  }
}
