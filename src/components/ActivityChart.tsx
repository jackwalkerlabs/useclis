import { useId, useState, type PointerEvent } from 'react';
import DateRangeSelect from './DateRangeSelect';
import { activityWindow, dateLabel, type DateRange } from '../lib/date-ranges';
export function Sparkline({ values, name = 'Project', height = 42 }: { values: number[]; name?: string; height?: number }) {
  if (values.length < 2) return <span className="chart-unavailable">Activity unavailable</span>;
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => `${3 + index / (values.length - 1) * 134},${height - 4 - value / max * (height - 10)}`).join(' ');
  return <svg className="sparkline" viewBox={`0 0 140 ${height}`} role="img" aria-label={`${name}, weekly commits: ${values.join(', ')}`} preserveAspectRatio="none"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></svg>;
}
export default function ActivityChart({ weeks, name, checkedAt }: { weeks: number[]; name: string; checkedAt: string }) {
  const [range, setRange] = useState<DateRange>('30d');
  const [selected, setSelected] = useState<number | null>(null);
  const id = useId();
  const series = activityWindow(weeks, range, checkedAt);
  const values = series.map(point => point.value);
  const max = Math.max(...values, 1);
  const total = values.reduce((sum, value) => sum + value, 0);
  const coords = values.map((value, index) => [44 + (values.length === 1 ? .5 : index / (values.length - 1)) * 570, 175 - value / max * 140]);
  const points = coords.map(point => point.join(',')).join(' ');
  const inspectPoint = (event: PointerEvent<SVGSVGElement>) => { const box = event.currentTarget.getBoundingClientRect(); const x = (event.clientX - box.left) / box.width * 640; setSelected(Math.max(0, Math.min(values.length - 1, Math.round((x - 44) / 570 * (values.length - 1))))); };
  return <section className="activity-panel" aria-labelledby={id}>
    <div className="activity-heading"><div><h2 id={id}>Repository activity</h2><p>Commits per week · GitHub snapshot</p></div><DateRangeSelect label="Activity date range" value={range} onChange={value => { setRange(value); setSelected(null); }} /></div>
    <div className="chart-total">{values.length ? (selected == null ? total : values[selected]).toLocaleString('en') : '—'} <span>{selected == null ? `commits across ${values.length} ${values.length === 1 ? 'week' : 'weeks'}` : `commits · week of ${dateLabel(series[selected].date)}`}</span></div>
    {values.length ? <svg className="large-chart" viewBox="0 0 640 205" role="img" aria-label={`${name} commits across ${values.length} weekly buckets. ${values.join(', ')}`} tabIndex={0} onPointerLeave={event => { if (event.pointerType === 'mouse') setSelected(null); }} onPointerDown={inspectPoint} onPointerMove={event => { if (event.pointerType === 'mouse' || event.buttons) inspectPoint(event); }} onBlur={() => setSelected(null)} onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); setSelected(index => Math.max(0, Math.min(values.length - 1, (index ?? 0) + (event.key === 'ArrowRight' ? 1 : -1)))); } }}>
      {[0, .5, 1].map(value => <g key={value}><line x1="44" x2="615" y1={175 - value * 140} y2={175 - value * 140} stroke="var(--border-subtle)" strokeDasharray="3 4" /><text x="32" y={179 - value * 140} textAnchor="end">{Math.round(max * value)}</text></g>)}
      {values.length > 1 && <polygon points={`44,175 ${points} 614,175`} fill="var(--green-50)" />}
      <polyline points={points} fill="none" stroke="var(--green-600)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {values.length === 1 && <circle cx={coords[0][0]} cy={coords[0][1]} r="4" fill="var(--green-600)" />}
      {selected != null && <g><line x1={coords[selected][0]} x2={coords[selected][0]} y1="25" y2="175" stroke="var(--gray-300)" strokeDasharray="3 3" /><circle cx={coords[selected][0]} cy={coords[selected][1]} r="4" fill="var(--green-600)" stroke="white" strokeWidth="2" /></g>}
      <text x="44" y="199">{dateLabel(series[0].date)}</text><text x="614" y="199" textAnchor="end">{dateLabel(checkedAt)}</text>
    </svg> : <p className="chart-help">No activity recorded for this period.</p>}
    <p className="chart-help">Tap, hover, or use the arrow keys to inspect weekly commits. Weekly totals can extend beyond the selected dates; the latest week may be incomplete. All time includes up to 52 recorded weeks. Hourly data is unavailable.</p>
  </section>;
}
