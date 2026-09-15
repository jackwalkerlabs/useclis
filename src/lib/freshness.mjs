// Daily collection gets a 12-hour allowance for scheduling, retries and publication.
export const freshnessWindowHours = 36;
export const homebrewSourceWindowHours = 72;
/** @typedef {{ checkedAt?: string | null, attemptedAt?: string | null, status?: string, generatedDate?: string | null }} Snapshot */
/** @param {Snapshot | null | undefined} snapshot */
export function snapshotFreshness(snapshot, provider = 'github', now = Date.now()) {
  const checked = Date.parse(snapshot?.checkedAt ?? '');
  if (!Number.isFinite(checked) || checked > now) return 'unavailable';
  if (snapshot?.status === 'error') return 'failed';
  if (now - checked > freshnessWindowHours * 3600000) return 'stale';
  if (provider === 'homebrew' && snapshot?.generatedDate) {
    const generated = Date.parse(snapshot.generatedDate);
    if (!Number.isFinite(generated) || generated > now || now - generated > homebrewSourceWindowHours * 3600000) return 'stale';
  }
  return snapshot?.status === 'pending' ? 'pending' : 'fresh';
}
export const freshnessLabels = {
  fresh: 'Within freshness window',
  stale: 'Stale data — showing the last saved observation',
  failed: 'Refresh failed — showing the last saved observation (stale)',
  pending: 'Refresh pending — showing the last saved observation',
  unavailable: 'No successful observation available',
};
