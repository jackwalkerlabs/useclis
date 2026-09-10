import { ArrowRight } from 'lucide-react';
import { number, type Tool } from '../data/tools';

export default function DiscoveryRail({ title, id, tools, sort, caption, onViewAll }: {
  title: string;
  id: string;
  tools: Tool[];
  sort: string;
  caption?: string;
  onViewAll: (sort: string) => void;
}) {
  return <section className="discovery-section" aria-labelledby={id}>
    <div className="useclis-section-heading">
      <h2 id={id}>{title}</h2>
      <a href={`/?sort=${sort}#directory`} onClick={event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onViewAll(sort);
      }} aria-label={`View all ${title.toLowerCase()}`}>View all <ArrowRight size={14} /></a>
    </div>
    <ul className="discovery-rail" aria-label={title} tabIndex={0}>
      {tools.map(tool => <li key={tool.slug}><a className="discovery-card" href={`/tools/${tool.slug}/`}>
        <span className={`discovery-badge ${sort === 'active' ? 'discovery-badge-active' : ''}`}>{sort === 'active' ? 'Active' : 'Listed'}</span>
        <div className="discovery-identity">
          <img src={tool.logo} alt="" width="40" height="40" loading="lazy" />
          <div><h3>{tool.name}</h3><p>{tool.category}</p></div>
        </div>
        <dl className="discovery-metrics">
          <div><dt>Stars</dt><dd>{number(tool.stars)}</dd></div>
          <div><dt>Commits · 1w</dt><dd>{number(tool.weeklyCommits)}</dd></div>
          <div><dt>Command</dt><dd><code title={tool.command}>{tool.command}</code></dd></div>
        </dl>
      </a></li>)}
    </ul>
    {caption && <p className="discovery-caption">{caption}</p>}
  </section>;
}
