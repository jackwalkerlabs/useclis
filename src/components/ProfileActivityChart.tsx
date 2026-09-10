import { useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import type { ActivityPoint } from '../lib/profiles';

const dateLabel = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
export default function ProfileActivityChart({ points, name, repositories, totalRepositories }: { points: ActivityPoint[]; name: string; repositories: number; totalRepositories: number }) {
  const id = useId();
  const plot = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 960, height: 390 });
  useEffect(() => {
    if (!plot.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0 && entry.contentRect.height > 0) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(plot.current);
    return () => observer.disconnect();
  }, []);
  const left = size.width < 600 ? 36 : 64;
  const right = size.width - (size.width < 600 ? 12 : 32);
  const bottom = size.height - 42;
  const top = size.width < 600 ? 30 : 56;
  const plotWidth = right - left;
  const [range, setRange] = useState(12);
  const [selected, setSelected] = useState<number | null>(null);
  const series = points.slice(-range);
  const total = series.reduce((sum, point) => sum + point.commits, 0);
  const max = Math.max(4, Math.ceil(Math.max(...series.map(point => point.commits), 0) / 4) * 4);
  const coords = series.map((point, index) => [left + index / Math.max(series.length - 1, 1) * plotWidth, bottom - point.commits / max * (bottom - top)]);
  const line = coords.map(point => point.join(',')).join(' ');
  const inspect = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width * size.width;
    setSelected(Math.max(0, Math.min(series.length - 1, Math.round((x - left) / plotWidth * (series.length - 1)))));
  };
  return <section className="profile-chart" aria-labelledby={`${id}-heading`}>
    <div className="profile-chart-heading">
      <div><h2 id={`${id}-heading`}>Repository activity</h2><p><strong>{series.length ? total.toLocaleString('en') : '—'}</strong><span>commits over {series.length} weeks</span></p></div>
      <div className="profile-chart-controls"><span className="chart-legend"><i />Weekly commits</span><select aria-label="Activity period" value={range} onChange={event => { setRange(Number(event.target.value)); setSelected(null); }}><option value={12}>Last 12 weeks</option><option value={26}>Last 26 weeks</option><option value={52}>Last year</option></select></div>
    </div>
    {series.length > 1 ? <div className="profile-plot" ref={plot}>
      <svg viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="none" tabIndex={0} role="img" aria-label={`${name}, weekly repository commits. Use arrow keys to inspect. ${series.map(point => `${point.date}: ${point.commits}`).join('; ')}`} onPointerDown={inspect} onPointerMove={event => { if (event.pointerType === 'mouse' || event.buttons) inspect(event); }} onPointerLeave={event => { if (event.pointerType === 'mouse') setSelected(null); }} onBlur={() => setSelected(null)} onKeyDown={event => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); setSelected(index => Math.max(0, Math.min(series.length - 1, index === null ? (event.key === 'ArrowRight' ? 0 : series.length - 1) : index + (event.key === 'ArrowRight' ? 1 : -1)))); }
        if (event.key === 'Escape') setSelected(null);
      }}>
        <defs><linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity=".34" /><stop offset="100%" stopColor="#6366f1" stopOpacity=".025" /></linearGradient></defs>
        {[0, 1, 2, 3, 4].map(tick => <g key={tick}><line x1={left} x2={right} y1={bottom - tick / 4 * (bottom - top)} y2={bottom - tick / 4 * (bottom - top)} stroke="var(--border-subtle)" /><text x={left - 12} y={bottom - tick / 4 * (bottom - top) + 4} textAnchor="end">{(max * tick / 4).toLocaleString('en')}</text></g>)}
        <polygon points={`${left},${bottom} ${line} ${right},${bottom}`} fill={`url(#${id}-fill)`} />
        <polyline points={line} fill="none" stroke="#6366f1" strokeWidth="2.3" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {series.map((point, index) => (index === 0 || index === series.length - 1 || index % Math.ceil(series.length / (size.width < 600 ? 3 : 6)) === 0) && <text key={point.date} x={coords[index][0]} y={size.height - 10} textAnchor={index === 0 ? 'start' : index === series.length - 1 ? 'end' : 'middle'}>{dateLabel(point.date)}</text>)}
        {selected !== null && <g><line x1={coords[selected][0]} x2={coords[selected][0]} y1={top - 16} y2={bottom} stroke="#a1a1aa" /><circle cx={coords[selected][0]} cy={coords[selected][1]} r="4.5" fill="#6366f1" stroke="white" strokeWidth="2" /></g>}
      </svg>
      {selected !== null && <div className="profile-chart-tooltip" style={{ left: `${Math.max(18, Math.min(82, coords[selected][0] / size.width * 100))}%` }}><span>Week of {dateLabel(series[selected].date)}</span><strong><i />{series[selected].commits.toLocaleString('en')} commits</strong></div>}
      <span className="sr-only" role="status">{selected !== null ? `Week of ${dateLabel(series[selected].date)}: ${series[selected].commits.toLocaleString('en')} commits` : ''}</span>
    </div> : <div className="profile-chart-empty">Weekly activity is not available yet.</div>}
    <p className="profile-chart-note">Across {repositories} of {totalRepositories} listed {totalRepositories === 1 ? 'repository' : 'repositories'}. {series.length ? `Through the week of ${dateLabel(series.at(-1)!.date)}. ` : ''}Latest week may be incomplete.<span>Hover, tap, or use arrow keys to explore.</span></p>
  </section>;
}
