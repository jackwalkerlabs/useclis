import { useBookmarks } from '../lib/bookmarks';
import { directoryStateKey, directoryStateEvent, openSavedHere } from '../lib/saved-navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, Bookmark, Check, Search, X } from 'lucide-react';
import { Button } from '../../design-system/components/core/Button.jsx';
import { categories, number, type Tool } from '../data/tools';
import { searchRecovery } from '../lib/search-recovery.mjs';
import { filterTools, numericSorts, searchMatch } from '../lib/filter.mjs';
import DateRangeSelect from './DateRangeSelect';
import { activityWindow, dateRanges, type DateRange } from '../lib/date-ranges';
import { Sparkline } from './ActivityChart';
import activityData from '../data/activity.json';
import AgentPrompt from './AgentPrompt';
import { resolveHomepageExamples } from '../lib/homepage-examples';
import HeroIntro from './HeroIntro';
import DiscoveryRail from './DiscoveryRail';
import DownloadCount from './DownloadCount';
import { downloadLabels } from '../lib/downloads.mjs';
const activity = activityData as Record<string, { weeks: number[]; checkedAt: string; source: string }>;
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

export default function Directory({ tools, siteUrl }: { tools: Tool[]; siteUrl?: string }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All categories');
  const [selectedSort, setSort] = useState('');
  // Relevance has no meaning without a query; preserve all other explicit sorts.
  const explicitSort = selectedSort === 'relevance' && !query.trim() ? '' : selectedSort;
  const sort = explicitSort || (query.trim() ? 'relevance' : 'stars');
  const [selectedDirection, setDirection] = useState<'asc' | 'desc'>('desc');
  const ascending = selectedDirection === 'asc' && numericSorts.includes(sort);
  const direction = ascending ? 'asc' : 'desc';
  const [downloadSource, setDownloadSource] = useState('homebrew');
  const metricLabel = downloadSource === 'homebrew' ? 'Brew installs · 30d' : `${downloadLabels[downloadSource as keyof typeof downloadLabels]} · ${downloadSource === 'github' ? 'cumulative' : '30d'}`;
  const [range, setRange] = useState<DateRange>('30d');
  const rangeLabel = dateRanges.find(option => option.value === range)!.label;
  const shortRange = range === 'all' ? 'All time' : range;
  const activityValues = useMemo(() => Object.fromEntries(Object.entries(activity).map(([slug, history]) => [
    slug, activityWindow(history.weeks, range, history.checkedAt).map(point => point.value),
  ])), [range]);
  const weeksFor = (slug: string) => activityValues[slug] ?? [];
  const { saved, toggleSaved } = useBookmarks();
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
      setSort(initialSort && ['relevance', 'stars', 'homebrew', 'npm', 'pypi', 'github', 'name', 'featured', 'recent', 'active'].includes(initialSort) ? initialSort : '');
      const source = params.get('downloads');
      setDownloadSource(initialSort && ['homebrew', 'npm', 'pypi', 'github'].includes(initialSort) ? initialSort : source && ['homebrew', 'npm', 'pypi', 'github'].includes(source) ? source : 'homebrew');
      setDirection(params.get('order') === 'asc' ? 'asc' : 'desc');
      setOnlySaved(params.get('saved') === '1');
      const initialRange = dateRanges.find(option => option.value === params.get('period') && option.value !== '24h');
      setRange(initialRange?.value ?? '30d');
    };
    restoreFilters();
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
    explicitSort ? url.searchParams.set('sort', explicitSort) : url.searchParams.delete('sort');
    explicitSort && ascending ? url.searchParams.set('order', 'asc') : url.searchParams.delete('order');
    downloadSource !== 'homebrew' ? url.searchParams.set('downloads', downloadSource) : url.searchParams.delete('downloads');
    range !== '30d' ? url.searchParams.set('period', range) : url.searchParams.delete('period');
    window.history.replaceState(null, '', url);
    try { window.sessionStorage.setItem(directoryStateKey, url.search); } catch {}
    window.dispatchEvent(new window.Event(directoryStateEvent));
  }, [query, category, onlySaved, explicitSort, ascending, range, downloadSource, hydrated]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 2600); return () => clearTimeout(timer); }, [notice]);
  const toggleSave = (tool: Tool) => {
    const result = toggleSaved(tool.slug);
    setNotice(result.persisted ? `${tool.name} ${result.isSaved ? 'saved' : 'removed from saved tools'}` : 'Saved for this page only. Browser storage is unavailable.');
  };
  const results = filterTools(tools, { query, category, sort, direction, onlySaved, saved }) as Tool[];
  // Repeated header activation reverses the active metric; a new metric starts highest first.
  const sortByColumn = (metric: string) => { setDirection(sort === metric && !ascending ? 'asc' : 'desc'); setSort(metric); };
  const sortState = (metric: string) => sort === metric ? (ascending ? 'ascending' : 'descending') : 'none';
  const SortIcon = ascending ? ArrowUp : ArrowDown;
  const suggestions = results.length ? [] : searchRecovery(tools, query);
  const reset = () => { setQuery(''); setCategory('All categories'); setOnlySaved(false); };
  const recentlyListed = filterTools(tools, { sort: 'recent' }).slice(0, 8) as Tool[];
  const mostActive = filterTools(tools, { sort: 'active' }).filter(tool => (tool.weeklyCommits ?? 0) > 0).slice(0, 8) as Tool[];
  const viewCollection = (nextSort: string) => {
    reset();
    setSort(nextSort);
    document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth' });
  };
  const totalStars = sum(tools.map(tool => tool.stars ?? 0));
  return <div className="useclis-home container">
    <section className="useclis-hero">
      <HeroIntro count={tools.length} />
      <form className="useclis-search" id="search" role="search" onSubmit={event => { event.preventDefault(); document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth' }); }}><Search size={17} /><input ref={input} aria-label="Search CLIs, commands, tasks, or GitHub repositories" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search CLIs, commands, or GitHub repos…" />{query ? <button type="button" className="icon-button" aria-label="Clear search" onClick={() => setQuery('')}><X size={16} /></button> : <kbd>/</kbd>}<Button size="sm" type="submit">Explore <ArrowRight size={13} /></Button></form>
      <div className="useclis-subnav"><a href="#directory">Browse CLIs</a><span>·</span><a href="/categories/">Categories</a><span>·</span><button onClick={openSavedHere}>Saved CLIs</button></div>
      <AgentPrompt siteUrl={siteUrl} examples={resolveHomepageExamples(tools)} />
    </section>
    <DiscoveryRail title="Recently listed" id="recently-listed-title" tools={recentlyListed} sort="recent" onViewAll={viewCollection} />
    {mostActive.length > 0 && <DiscoveryRail title="Most active this week" id="most-active-title" tools={mostActive} sort="active" onViewAll={viewCollection} caption="Ranked by commits in the latest week of each repository’s GitHub activity snapshot." />}
    <section className="useclis-leaderboard" id="directory" aria-labelledby="leaderboard-title"><div className="useclis-section-heading"><div className="leaderboard-title"><h2 id="leaderboard-title">{onlySaved ? 'Saved CLIs' : 'Leaderboard'}</h2><span>{results.length} CLIs</span></div><div className="leaderboard-filters"><select aria-label="Filter category" value={category} onChange={event => setCategory(event.target.value)}><option>All categories</option>{categories.map(name => <option key={name}>{name}</option>)}</select><select aria-label="Sort tools" value={ascending ? `${sort}-asc` : sort} onChange={event => { const [next, order] = event.target.value.split('-'); setSort(next); setDirection(order === 'asc' ? 'asc' : 'desc'); if (['homebrew', 'npm', 'pypi', 'github'].includes(next)) setDownloadSource(next); }}>{(query.trim() || sort === 'relevance') && <option value="relevance">Most relevant</option>}<option value="stars">Most stars</option><option value="stars-asc">Fewest stars</option><option value="homebrew">Most Homebrew installs</option><option value="homebrew-asc">Fewest Homebrew installs</option><option value="npm">Most npm downloads · 30d</option><option value="npm-asc">Fewest npm downloads · 30d</option><option value="pypi">Most PyPI downloads · 30d</option><option value="pypi-asc">Fewest PyPI downloads · 30d</option><option value="github">Most GitHub binary downloads · cumulative</option><option value="github-asc">Fewest GitHub binary downloads · cumulative</option><option value="name">Name: A–Z</option><option value="featured">Featured first</option><option value="recent">Recently listed</option><option value="active">Most active this week</option></select><select aria-label="Download source" value={downloadSource} onChange={event => { setDownloadSource(event.target.value); if (['homebrew', 'npm', 'pypi', 'github'].includes(sort)) { setSort(event.target.value); setDirection('desc'); } }}><option value="homebrew">Homebrew installs</option><option value="npm">npm downloads</option><option value="pypi">PyPI downloads</option><option value="github">GitHub binary downloads</option></select><DateRangeSelect label="Leaderboard date range" value={range} onChange={setRange} /></div></div>
      {(query || category !== 'All categories' || onlySaved) && <div className="active-filters"><span>{results.length} {results.length === 1 ? 'CLI' : 'CLIs'}{query ? ` matching “${query}”` : ''}{onlySaved ? ' saved in this browser' : ''}</span><button onClick={reset}>Clear filters <X size={12} /></button></div>}
      <div className="leaderboard-scroll"><table className="leaderboard-table"><thead><tr><th scope="col">#</th><th scope="col">CLI / Repository</th><th scope="col" className="command-column">Command</th><th scope="col" className="numeric" aria-sort={sortState('stars')}><button onClick={() => sortByColumn('stars')}>GitHub stars {sort === 'stars' && <SortIcon size={12} aria-hidden="true" />}</button></th><th scope="col" className="activity-column">Activity · {shortRange}</th><th scope="col" className="numeric brew-column" aria-sort={sortState(downloadSource)}><button onClick={() => sortByColumn(downloadSource)} aria-describedby="brew-explanation"><span>{metricLabel}</span>{sort === downloadSource && <SortIcon size={12} aria-hidden="true" />}</button></th><th scope="col"><span className="sr-only">Save tool</span></th></tr></thead><tbody>{results.map((tool, index) => <tr key={tool.slug}><td className="rank">{sort === 'stars' && !ascending && index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}</td><td><a href={`/tools/${tool.slug}/`} className="table-project"><img src={tool.logo} alt="" width="33" height="33" loading="lazy" /><span><strong>{tool.name}</strong><span className="table-repo">{tool.repo} · {tool.useCase}</span><code className="mobile-command">{tool.command}</code>{query.trim() && <span className="search-match">{searchMatch(tool, query)?.reason}</span>}</span></a><DownloadCount source={downloadSource} tool={tool} mobile /></td><td className="command-column"><code className="cli-command">{tool.command}</code></td><td className="numeric"><a className="table-stars" href={`https://github.com/${tool.repo}`} target="_blank" rel="noreferrer">{tool.stars?.toLocaleString('en') ?? '—'}</a><a className="mobile-activity" href={`/tools/${tool.slug}/#activity`} aria-label={`View ${tool.name} activity · ${rangeLabel.toLowerCase()}`}><Sparkline values={weeksFor(tool.slug)} name={tool.name} /></a></td><td className="activity-column"><a className="table-chart" href={`/tools/${tool.slug}/#activity`} aria-label={`View ${tool.name} activity chart · ${rangeLabel.toLowerCase()}`}><Sparkline values={weeksFor(tool.slug)} name={tool.name} /></a></td><td className="numeric brew-column"><DownloadCount source={downloadSource} tool={tool} /></td><td><button className={`icon-button ${saved.includes(tool.slug) ? 'is-saved' : ''}`} aria-label={`${saved.includes(tool.slug) ? 'Unsave' : 'Save'} ${tool.name}`} aria-pressed={saved.includes(tool.slug)} onClick={() => toggleSave(tool)}><Bookmark size={15} fill={saved.includes(tool.slug) ? 'currentColor' : 'none'} /></button></td></tr>)}</tbody></table></div>
      {results.length === 0 && <div className="empty-state"><Search size={27} /><h3>{onlySaved ? 'No saved CLIs match' : 'No CLIs found'}</h3>
        {query.trim() ? <><p>No matches for “{query}” with these filters. This task may not be covered by the catalog.</p>
          {suggestions.length > 0 && <><p>Explore a broader search across all CLIs. These are related terms, not verified solutions to your full task.</p><div className="search-suggestions">{suggestions.map(item => <a key={item.query} className="button secondary" href={`/?q=${encodeURIComponent(item.query)}#directory`}>Search “{item.query}” ({item.count})</a>)}</div></>}
          {(onlySaved || category !== 'All categories') && <p><a href={`/?q=${encodeURIComponent(query)}#directory`}>Search the full catalog for this query</a></p>}
        </> : <p>{onlySaved ? 'Bookmark a CLI to keep it in your collection, or clear the filters.' : 'Try another category or browse the complete catalog.'}</p>}
        <Button variant="secondary" onClick={reset}>Browse all CLIs</Button></div>}

      <p className="brew-explanation" id="brew-explanation">{downloadSource === 'homebrew' ? 'Brew installs: explicitly requested installs over 30 days from Homebrew installations that report analytics; not unique users or downloads across all package managers.' : downloadSource === 'github' ? 'GitHub binary downloads: cumulative downloads of selected binaries from published, non-prerelease releases. Includes repeat and automated downloads; not a 30-day count.' : `${downloadLabels[downloadSource as keyof typeof downloadLabels]} over 30 days, including repeat, automated, and dependency downloads. Not unique users or confirmed installations.`} Sources can overlap; do not add their counts together. <a href={downloadSource === 'homebrew' ? '/about/#homebrew' : '/about/#downloads'}>How counts work ↗</a></p>
      <p className="leaderboard-range-note">Weekly activity · {rangeLabel.toLowerCase()}, ending at each GitHub snapshot. Weekly totals may extend beyond the selected dates. All time includes up to 52 recorded weeks.</p>
      <div className="leaderboard-foot"><p><span className="verified-disc"><Check size={9} strokeWidth={3} /></span> Repository metadata from GitHub. Checked {new Date(tools[0].checkedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}.</p><a href="/about/">About the data ↗</a></div>
    </section>
    <section className="useclis-stats" aria-label="Directory statistics"><div><span>Listed CLIs</span><strong>{tools.length}</strong></div><div><span>Combined GitHub stars</span><strong>{number(totalStars)}</strong></div><div><span>Categories</span><strong>{categories.length}</strong></div><div><span>Commits · {rangeLabel.toLowerCase()}</span><strong>{number(sum(tools.map(tool => sum(weeksFor(tool.slug)))))}</strong></div></section>
    <section className="useclis-categories"><div className="useclis-section-heading"><h2>Browse by category</h2><a href="/categories/">View all <ArrowRight size={13} /></a></div><div>{categories.map(name => <a key={name} href={`/?category=${encodeURIComponent(name)}#directory`}>{name}<span>{tools.filter(tool => tool.category === name).length}</span></a>)}</div></section>
    {notice && <div className="toast" role="status"><Check size={16} />{notice}</div>}
  </div>;
}
