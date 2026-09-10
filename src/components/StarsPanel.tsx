import { useState, type PointerEvent } from 'react';
import { Copyright, GitFork, History, Star, Timer } from 'lucide-react';
import { starWindow } from '../lib/star-history.mjs';
type Point = { date: string; stars: number };
export default function StarsPanel({ total, points, repo, license, lastCommitAt, createdAt, checkedAt }: { total: number; points: Point[]; repo: string; license: string | null; lastCommitAt?: string | null; createdAt?: string; checkedAt: string }) {
  const { points: series, change, percentage, elapsedDays } = starWindow(points);
  const [selected, setSelected] = useState<number | null>(null);
  const firstDate = series.length ? Date.parse(series[0].date) : 0;
  const dateSpan = series.length > 1 ? Date.parse(series.at(-1)!.date) - firstDate : 1;
  const min = Math.min(...series.map(p => p.stars));
  const max = Math.max(...series.map(p => p.stars));
  const coords = series.map(point => [8 + (Date.parse(point.date) - firstDate) / dateSpan * 364, 80 - (point.stars - min) / Math.max(max - min, 1) * 66]);
  const polyline = coords.map(point => point.join(',')).join(' ');
  const dateLabel = (value: string) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const age = createdAt ? Math.max(0, Math.floor((Date.parse(checkedAt) - Date.parse(createdAt)) / 31557600000)) : null;
  const hours = lastCommitAt ? Math.max(0, Math.floor((Date.parse(checkedAt) - Date.parse(lastCommitAt)) / 3600000)) : null;
  const lastCommit = hours === null ? '—' : hours < 1 ? 'Under an hour ago' : hours < 24 ? `${hours} ${hours === 1 ? 'hour' : 'hours'} ago` : `${Math.floor(hours / 24)} days ago`;
  const lineColor = change != null && change < 0 ? 'var(--red-500)' : 'var(--green-600)';
  const inspectPoint = (event: PointerEvent<SVGSVGElement>) => { const bounds = event.currentTarget.getBoundingClientRect(); const x = (event.clientX - bounds.left) / bounds.width * 380; let nearest = 0; coords.forEach((point, i) => { if (Math.abs(point[0] - x) < Math.abs(coords[nearest][0] - x)) nearest = i; }); setSelected(nearest); };
  return <aside className="stars-panel" aria-label="GitHub repository statistics">
    <div className="stars-panel-heading"><div><Star size={20} /><strong>{(selected == null ? total : series[selected].stars).toLocaleString('en')}</strong><span>stars</span></div>{change !== null && <span className={`stars-gain ${change < 0 ? 'negative' : ''}`}>{change > 0 ? '+' : ''}{change.toLocaleString('en')} {percentage !== null && <span>({percentage > 0 ? '+' : ''}{percentage.toFixed(1)}%)</span>}</span>}</div>
    {series.length > 1 ? <svg className="stars-history" viewBox="0 0 380 94" preserveAspectRatio="none" role="img" tabIndex={0} aria-label={`Recorded GitHub star totals: ${series.map(point => `${point.date}: ${point.stars}`).join('; ')}`} onPointerLeave={event => { if (event.pointerType === 'mouse') setSelected(null); }} onPointerDown={inspectPoint} onPointerMove={event => { if (event.pointerType === 'mouse' || event.buttons) inspectPoint(event); }} onBlur={() => setSelected(null)} onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); setSelected(index => Math.max(0, Math.min(series.length - 1, (index ?? 0) + (event.key === 'ArrowRight' ? 1 : -1)))); } }}><polygon points={`8,90 ${polyline} 372,90`} fill={change != null && change < 0 ? 'var(--red-50)' : 'var(--green-50)'} /><polyline points={polyline} fill="none" stroke={lineColor} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />{selected != null && <circle cx={coords[selected][0]} cy={coords[selected][1]} r="3" fill={lineColor} />}</svg> : <div className="star-history-pending"><span className="status-dot" /><span>{series.length ? `Star history starts ${dateLabel(series[0].date)}` : 'Star history unavailable'}</span></div>}
    <div className="stars-period">{selected != null ? dateLabel(series[selected].date) : series.length > 1 ? elapsedDays >= 30 ? 'Last 30 days' : `Since ${dateLabel(series[0].date)}` : series.length ? 'Daily snapshots · first point recorded' : 'No recorded snapshots'}</div>
    <dl className="stars-details"><div><dt><Timer size={18} />Last commit</dt><span /><dd title="Relative to the snapshot date">{lastCommit}</dd></div><div><dt><History size={18} />Repository age</dt><span /><dd>{age === null ? '—' : age === 0 ? 'Under a year' : `${age} ${age === 1 ? 'year' : 'years'}`}</dd></div><div><dt><Copyright size={18} />License</dt><span /><dd><a href={`https://github.com/${repo}`} target="_blank" rel="noreferrer">{license ?? 'See license'}</a></dd></div><div><dt><GitFork size={18} />Repository</dt><span /><dd><a href={`https://github.com/${repo}`} target="_blank" rel="noreferrer">{repo}</a></dd></div></dl>
    <p className="stars-checked">GitHub snapshot · {dateLabel(checkedAt)}. <a href="/about/#star-history">How stars are tracked ↗</a></p>
  </aside>;
}
