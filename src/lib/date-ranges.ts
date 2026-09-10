export const dateRanges = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '3m', label: 'Last 3 months' },
  { value: '6m', label: 'Last 6 months' },
  { value: '12m', label: 'Last 12 months' },
  { value: 'all', label: 'All time' },
] as const;

export type DateRange = typeof dateRanges[number]['value'];
export const dateLabel = (date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** Calendar months, clamped to the last day of the destination month, in UTC. */
export function rangeStart(range: DateRange, asOf: string): number {
  if (range === 'all') return -Infinity;
  const end = new Date(asOf);
  end.setUTCHours(0, 0, 0, 0);
  if (range === '24h' || range === '7d' || range === '30d') {
    return end.getTime() - ({ '24h': 1, '7d': 7, '30d': 30 }[range]) * 86400000;
  }
  const day = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() - ({ '3m': 3, '6m': 6, '12m': 12 }[range]));
  const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(day, lastDay));
  return end.getTime();
}

/** Participation data consists of Sunday-based weekly buckets, including the current week. */
export function activityWindow(weeks: number[], range: DateRange, checkedAt: string) {
  const latestWeek = new Date(checkedAt);
  latestWeek.setUTCHours(0, 0, 0, 0);
  latestWeek.setUTCDate(latestWeek.getUTCDate() - latestWeek.getUTCDay());
  const cutoff = rangeStart(range, checkedAt);
  return weeks.map((value, index) => ({
    value,
    date: new Date(latestWeek.getTime() - (weeks.length - 1 - index) * 7 * 86400000).toISOString().slice(0, 10),
  })).filter(point => Date.parse(point.date) + 7 * 86400000 > cutoff);
}
