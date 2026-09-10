import type { Tool } from '../data/tools';

export const ownerKey = (repo: string) => repo.split('/')[0].toLowerCase();
export const profileHref = (repoOrLogin: string) => `/github/${ownerKey(repoOrLogin)}/`;
export type ActivitySnapshot = { weeks: number[]; checkedAt: string };
export type ActivityPoint = { date: string; commits: number };
const weekMs = 7 * 86400000;

export function ownerStats(listings: Tool[], activity: Record<string, ActivitySnapshot>) {
  // A monorepo may provide several CLIs. Count its stars and commits only once.
  const repos = [...new Map(listings.map(tool => [tool.repo.toLowerCase(), tool])).values()];
  const histories = repos.flatMap(tool => {
    const history = activity[tool.slug];
    if (!history?.weeks.length || !Number.isFinite(Date.parse(history.checkedAt))) return [];
    const end = new Date(history.checkedAt);
    end.setUTCHours(0, 0, 0, 0);
    end.setUTCDate(end.getUTCDate() - end.getUTCDay());
    return [new Map(history.weeks.map((commits, index) => [
      new Date(end.getTime() - (history.weeks.length - index - 1) * weekMs).toISOString().slice(0, 10), commits,
    ]))];
  });
  // Intersect actual week dates so differently aged snapshots are never shifted together.
  const points: ActivityPoint[] = histories.length ? [...histories[0].keys()]
    .filter(date => histories.every(history => history.has(date)))
    .sort().map(date => ({ date, commits: histories.reduce((total, history) => total + history.get(date)!, 0) })) : [];
  return {
    stars: repos.reduce((total, tool) => total + tool.stars, 0),
    repositories: repos.length,
    activityRepositories: histories.length,
    points,
    commits12: points.length ? points.slice(-12).reduce((total, point) => total + point.commits, 0) : null,
  };
}

export function websiteHref(website: string | null) {
  if (!website) return null;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(website) ? website : `https://${website}`);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}
