import { freshnessWindowHours } from '../../src/lib/freshness.mjs';
export function refreshRunHealth(runs, now = Date.now()) {
  const relevant = runs.filter(run => run.head_branch === 'main' && ['schedule', 'workflow_dispatch'].includes(run.event)).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const completed = relevant.find(run => run.status === 'completed');
  const success = relevant.find(run => run.conclusion === 'success');
  const problems = [];
  if (completed && completed.conclusion !== 'success') problems.push(`Latest completed daily refresh ${completed.id}: ${completed.conclusion}`);
  const checked = Date.parse(success?.created_at ?? '');
  if (!Number.isFinite(checked) || checked > now || now - checked > freshnessWindowHours * 3600000) problems.push(`No successful daily refresh started within ${freshnessWindowHours} hours`);
  return problems;
}

// Discovery reports success even when it admits nothing, so silence is the signal to watch.
export const discoveryRunWindowHours = 3;
export const discoveryAdmissionWindowDays = 3;
export function discoveryHealth(state, now = Date.now()) {
  const problems = [];
  const lastRun = Date.parse(state?.lastRunAt ?? '');
  if (!Number.isFinite(lastRun) || lastRun > now || now - lastRun > discoveryRunWindowHours * 3600000) {
    problems.push(`No discovery run recorded within ${discoveryRunWindowHours} hours`);
  }
  const admissions = Object.values(state?.candidates ?? {})
    .map(candidate => Date.parse(candidate?.acceptedAt ?? ''))
    .filter(time => Number.isFinite(time) && time <= now);
  const latest = admissions.length ? Math.max(...admissions) : null;
  if (latest === null || now - latest > discoveryAdmissionWindowDays * 86400000) {
    problems.push(`Discovery admitted no CLI within ${discoveryAdmissionWindowDays} days; its sources or rules may be exhausted`);
  }
  return problems;
}
