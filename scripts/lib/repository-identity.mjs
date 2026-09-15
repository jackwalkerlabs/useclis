/** Preserve the catalog join key while recording GitHub's canonical identity. */
export function repositoryIdentity(repo, requestedRepo, previous) {
  if (!Number.isSafeInteger(repo.id) || repo.id <= 0 || !/^[\w.-]+\/[\w.-]+$/.test(repo.full_name)
      || repo.html_url !== `https://github.com/${repo.full_name}`) throw new Error('Invalid GitHub repository identity');
  if (previous?.repositoryId != null && previous.repositoryId !== repo.id) throw new Error('GitHub repository identity changed');
  return { source: `https://github.com/${requestedRepo}`, canonicalSource: repo.html_url, repositoryId: repo.id };
}
