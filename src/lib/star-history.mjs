/** @param {{date:string, stars:number}[]} points @param {number} [days] */
export function starWindow(points, days = 30) {
  const sorted = [...points].filter(point => /^\d{4}-\d{2}-\d{2}$/.test(point.date) && Number.isFinite(point.stars) && point.stars >= 0).sort((a,b) => a.date.localeCompare(b.date));
  if (!sorted.length) return { points: [], change: null, percentage: null, elapsedDays: 0 };
  const latest = sorted.at(-1);
  const start = Date.parse(latest.date) - days * 86400000;
  const visible = sorted.filter(point => Date.parse(point.date) >= start);
  const first = visible[0];
  const change = visible.length > 1 ? latest.stars - first.stars : null;
  return { points: visible, change, percentage: change === null || first.stars === 0 ? null : change / first.stars * 100, elapsedDays: Math.round((Date.parse(latest.date) - Date.parse(first.date)) / 86400000) };
}
