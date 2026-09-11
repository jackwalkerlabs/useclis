// The scheduler holds only a repository-scoped Actions:write credential.
// GitHub's runner owns Git state, validation, and publication credentials.
export async function dispatchDiscovery(env, fetcher = fetch) {
  if (!env.GITHUB_DISPATCH_TOKEN) throw new Error('Missing GITHUB_DISPATCH_TOKEN');
  if (!/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY)) throw new Error('Invalid repository');
  const response = await fetcher(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}/actions/workflows/discover-clis.yml/dispatches`, {
    method: 'POST',
    // Workers supports follow/manual only. Reject redirects via the 204 check below.
    redirect: 'manual',
    signal: AbortSignal.timeout(20_000),
    headers: {
      Authorization: `Bearer ${env.GITHUB_DISPATCH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'useclis-discovery',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ ref: 'main' }),
  });
  if (response.status !== 204) throw new Error(`Discovery dispatch failed: HTTP ${response.status}`);
  console.log('Dispatched CLI discovery on main');
}

export default {
  async scheduled(_event, env) { await dispatchDiscovery(env); },
  fetch() { return new Response('Not found', { status: 404 }); },
};
