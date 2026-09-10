import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Bookmark, Check, Search, X } from 'lucide-react';
import { Button } from '../../design-system/components/core/Button.jsx';
import { categories, number, type Tool } from '../data/tools';
import { filterTools } from '../lib/filter.mjs';
import DateRangeSelect from './DateRangeSelect';
import { activityWindow, dateRanges, type DateRange } from '../lib/date-ranges';
import { Sparkline } from './ActivityChart';
import activityData from '../data/activity.json';
const activity = activityData as Record<string, { weeks: number[]; checkedAt: string; source: string }>;
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

export default function Directory({ tools }: { tools: Tool[] }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All categories');
  const [sort, setSort] = useState('stars');
  const [range, setRange] = useState<DateRange>('30d');
  const rangeLabel = dateRanges.find(option => option.value === range)!.label;
  const shortRange = range === 'all' ? 'All time' : range;
  const activityValues = useMemo(() => Object.fromEntries(Object.entries(activity).map(([slug, history]) => [
    slug, activityWindow(history.weeks, range, history.checkedAt).map(point => point.value),
  ])), [range]);
  const weeksFor = (slug: string) => activityValues[slug] ?? [];
  const [saved, setSaved] = useState<string[]>([]);
  const [onlySaved, setOnlySaved] = useState(false);
  const [notice, setNotice] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const restoreFilters = () => {
      const params = new URLSearchParams(window.location.search);
      setQuery(params.get('q') ?? '');
      const initialCategory = params.get('category');
      setCategory(initialCategory && categories.includes(initialCategory) ? initialCategory : 'All categories');
      const initialSort = params.get('sort');
      setSort(initialSort && ['stars', 'name', 'featured'].includes(initialSort) ? initialSort : 'stars');
      setOnlySaved(params.get('saved') === '1');
      const initialRange = dateRanges.find(option => option.value === params.get('period') && option.value !== '24h');
      setRange(initialRange?.value ?? '30d');
    };
    restoreFilters();
    try {
      const current = localStorage.getItem('useclis-saved');
      // Preserve bookmarks made before the app was renamed.
      const value: unknown = JSON.parse(current ?? localStorage.getItem('openrepo-saved') ?? '[]');
      if (Array.isArray(value)) {
        const bookmarks = value.filter((item): item is string => typeof item === 'string' && tools.some(tool => tool.slug === item));
        setSaved(bookmarks);
        if (current === null) localStorage.setItem('useclis-saved', JSON.stringify(bookmarks));
      }
    } catch {}
    setHydrated(true);
    const onKey = (event: KeyboardEvent) => { if (!document.querySelector('dialog[open]') && event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName) && !(event.target as HTMLElement).isContentEditable) { event.preventDefault(); input.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    window.addEventListener('popstate', restoreFilters);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('popstate', restoreFilters); };
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    const url = new URL(window.location.href);
    query ? url.searchParams.set('q', query) : url.searchParams.delete('q');
    category !== 'All categories' ? url.searchParams.set('category', category) : url.searchParams.delete('category');
    onlySaved ? url.searchParams.set('saved', '1') : url.searchParams.delete('saved');
    sort !== 'stars' ? url.searchParams.set('sort', sort) : url.searchParams.delete('sort');
    range !== '30d' ? url.searchParams.set('period', range) : url.searchParams.delete('period');
    window.history.replaceState(null, '', url);
  }, [query, category, onlySaved, sort, range, hydrated]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 2600); return () => clearTimeout(timer); }, [notice]);
  const toggleSave = (tool: Tool) => {
    const next = saved.includes(tool.slug) ? saved.filter(slug => slug !== tool.slug) : [...saved, tool.slug];
    setSaved(next);
    try { localStorage.setItem('useclis-saved', JSON.stringify(next)); setNotice(next.includes(tool.slug) ? `${tool.name} saved` : `${tool.name} removed from saved tools`); }
    catch { setNotice('Saved for this visit. Browser storage is unavailable.'); }
  };
  const results = filterTools(tools, { query, category, sort, onlySaved, saved }) as Tool[];
  const reset = () => { setQuery(''); setCategory('All categories'); setOnlySaved(false); };
  const featured = tools.filter(tool => tool.featured).slice(0, 4);
  const totalStars = sum(tools.map(tool => tool.stars ?? 0));
  return <div className="useclis-home container">
    <section className="useclis-hero">
      <a href="/about/" className="source-badge"><span className="verified-disc"><Check size={10} strokeWidth={3} /></span> Repository data from GitHub</a>
      <h1>The directory of<br />CLIs for agents</h1>
      <p>Find command-line tools for your agent’s next task.<br />Browse GitHub repos, inspect activity, and explore the commands.</p>
      <form className="useclis-search" id="search" role="search" onSubmit={event => { event.preventDefault(); document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth' }); }}><Search size={17} /><input ref={input} aria-label="Search CLIs, commands, tasks, or GitHub repositories" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search CLIs, commands, or GitHub repos…" />{query ? <button type="button" className="icon-button" aria-label="Clear search" onClick={() => setQuery('')}><X size={16} /></button> : <kbd>/</kbd>}<Button size="sm" type="submit">Explore <ArrowRight size={13} /></Button></form>
      <div className="useclis-subnav"><a href="#directory">Browse CLIs</a><span>·</span><a href="/categories/">Categories</a><span>·</span><button onClick={() => { reset(); setOnlySaved(true); document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth' }); }}>Saved CLIs</button></div>
    </section>
    <section className="useclis-featured" aria-labelledby="featured-title"><div className="useclis-section-heading"><h2 id="featured-title">Featured CLIs</h2><a href="#directory">View all <ArrowRight size={13} /></a></div><div className="featured-grid">{featured.map(tool => <a className="featured-card" key={tool.slug} href={`/tools/${tool.slug}/`}><div className="featured-identity"><img src={tool.logo} alt="" width="38" height="38" /><div><h3>{tool.name}</h3><span>{tool.category}</span></div><ArrowUpRight size={15} /></div><p className="featured-command"><span>Command</span> <code>{tool.command}</code></p><div className="featured-numbers"><div><span>GitHub stars</span><strong>{number(tool.stars)}</strong></div><div><span>Commits · {shortRange}</span><strong>{weeksFor(tool.slug).length ? number(sum(weeksFor(tool.slug))) : '—'}</strong></div></div><div className="featured-chart"><Sparkline values={weeksFor(tool.slug)} name={tool.name} height={48} /></div></a>)}</div><p className="featured-caption">Weekly commit activity · {rangeLabel.toLowerCase()}. Charts use an independent scale for each project.</p></section>
    <section className="useclis-leaderboard" id="directory" aria-labelledby="leaderboard-title"><div className="useclis-section-heading"><div className="leaderboard-title"><h2 id="leaderboard-title">{onlySaved ? 'Saved CLIs' : 'Leaderboard'}</h2><span>{results.length} CLIs</span></div><div className="leaderboard-filters"><select aria-label="Filter category" value={category} onChange={event => setCategory(event.target.value)}><option>All categories</option>{categories.map(name => <option key={name}>{name}</option>)}</select><select aria-label="Sort tools" value={sort} onChange={event => setSort(event.target.value)}><option value="stars">Most stars</option><option value="name">Name: A–Z</option><option value="featured">Featured first</option></select><DateRangeSelect label="Leaderboard date range" value={range} onChange={setRange} /></div></div>
      {(query || category !== 'All categories' || onlySaved) && <div className="active-filters"><span>{results.length} {results.length === 1 ? 'CLI' : 'CLIs'}{query ? ` matching “${query}”` : ''}{onlySaved ? ' saved in this browser' : ''}</span><button onClick={reset}>Clear filters <X size={12} /></button></div>}
      <div className="leaderboard-scroll"><table className="leaderboard-table"><thead><tr><th scope="col">#</th><th scope="col">CLI / Repository</th><th scope="col" className="command-column">Command</th><th scope="col" className="numeric"><button onClick={() => setSort('stars')}>GitHub stars <ArrowDown size={12} /></button></th><th scope="col" className="activity-column">Activity · {shortRange}</th><th scope="col" className="numeric commits-column">Commits · {shortRange}</th><th scope="col"><span className="sr-only">Save tool</span></th></tr></thead><tbody>{results.map((tool, index) => <tr key={tool.slug}><td className="rank">{sort === 'stars' && index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}</td><td><a href={`/tools/${tool.slug}/`} className="table-project"><img src={tool.logo} alt="" width="33" height="33" loading="lazy" /><span><strong>{tool.name}</strong><span className="table-repo">{tool.repo} · {tool.useCase}</span><code className="mobile-command">{tool.command}</code></span></a></td><td className="command-column"><code className="cli-command">{tool.command}</code></td><td className="numeric"><a className="table-stars" href={`https://github.com/${tool.repo}`} target="_blank" rel="noreferrer">{tool.stars?.toLocaleString('en') ?? '—'}</a><a className="mobile-activity" href={`/tools/${tool.slug}/#activity`} aria-label={`View ${tool.name} activity · ${rangeLabel.toLowerCase()}`}><Sparkline values={weeksFor(tool.slug)} name={tool.name} /></a></td><td className="activity-column"><a className="table-chart" href={`/tools/${tool.slug}/#activity`} aria-label={`View ${tool.name} activity chart · ${rangeLabel.toLowerCase()}`}><Sparkline values={weeksFor(tool.slug)} name={tool.name} /></a></td><td className="numeric commits-column commit-count">{weeksFor(tool.slug).length ? sum(weeksFor(tool.slug)).toLocaleString('en') : '—'}</td><td><button className={`icon-button ${saved.includes(tool.slug) ? 'is-saved' : ''}`} aria-label={`${saved.includes(tool.slug) ? 'Unsave' : 'Save'} ${tool.name}`} aria-pressed={saved.includes(tool.slug)} onClick={() => toggleSave(tool)}><Bookmark size={15} fill={saved.includes(tool.slug) ? 'currentColor' : 'none'} /></button></td></tr>)}</tbody></table></div>
      {results.length === 0 && <div className="empty-state"><Search size={27} /><h3>{onlySaved ? 'No saved CLIs match' : 'No CLIs found'}</h3><p>{onlySaved ? 'Bookmark a CLI to keep it in your collection, or clear the filters.' : 'Try a command, a task, or a GitHub repository.'}</p><Button variant="secondary" onClick={reset}>Browse all CLIs</Button></div>}
      <p className="leaderboard-range-note">Weekly activity · {rangeLabel.toLowerCase()}, ending at each GitHub snapshot. Weekly totals may extend beyond the selected dates. All time includes up to 52 recorded weeks.</p>
      <div className="leaderboard-foot"><p><span className="verified-disc"><Check size={9} strokeWidth={3} /></span> Repository metadata from GitHub. Checked {new Date(tools[0].checkedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}.</p><a href="/about/">About the data ↗</a></div>
    </section>
    <section className="useclis-stats" aria-label="Directory statistics"><div><span>Listed CLIs</span><strong>{tools.length}</strong></div><div><span>Combined GitHub stars</span><strong>{number(totalStars)}</strong></div><div><span>Categories</span><strong>{categories.length}</strong></div><div><span>Commits · {rangeLabel.toLowerCase()}</span><strong>{number(sum(tools.map(tool => sum(weeksFor(tool.slug)))))}</strong></div></section>
    <section className="useclis-categories"><div className="useclis-section-heading"><h2>Browse by category</h2><a href="/categories/">View all <ArrowRight size={13} /></a></div><div>{categories.map(name => <a key={name} href={`/?category=${encodeURIComponent(name)}#directory`}>{name}<span>{tools.filter(tool => tool.category === name).length}</span></a>)}</div></section>
    {notice && <div className="toast" role="status"><Check size={16} />{notice}</div>}
  </div>;
}
