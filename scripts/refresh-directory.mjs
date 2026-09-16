import { createGithubFetch } from './lib/github-rate-limit.mjs';
// One process shares the wait allowance across providers. Discovery uses the
// same workflow lock, so it cannot consume core quota while this collector waits.
globalThis.fetch = createGithubFetch();
for (const script of ['refresh-data', 'refresh-activity', 'snapshot-stars', 'refresh-homebrew', 'refresh-profiles', 'refresh-downloads']) {
  try { await import(`./${script}.mjs`); }
  catch (error) { console.error(`${script}: ${error.message}`); process.exitCode = 1; }
}
