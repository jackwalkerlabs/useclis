import { number, type Tool } from '../data/tools';
import { downloadLabels } from '../lib/downloads.mjs';
import BrewInstalls from './BrewInstalls';
export default function DownloadCount({ tool, source, mobile = false }: { tool: Tool; source: string; mobile?: boolean }) {
  if (source === 'homebrew') return <BrewInstalls tool={tool} mobile={mobile} />;
  const snapshot = tool.downloads[source];
  const value = source === 'github' ? snapshot?.total : snapshot?.counts['30d'];
  const label = `${downloadLabels[source as keyof typeof downloadLabels]} · ${source === 'github' ? 'cumulative' : '30d'}`;
  const className = mobile ? 'mobile-brew' : 'brew-count';
  if (value == null) return <span className={className} title={`${label}: unavailable`}>{mobile && `${label}: `}—<span className="sr-only"> {label}: unavailable</span></span>;
  const saved = snapshot?.status === 'error';
  const timing = snapshot?.checkedAt ? ` Checked ${snapshot.checkedAt.slice(0, 10)}. Source dated ${snapshot.end}.` : '';
  return <a className={className} href={`/tools/${tool.slug}/#downloads-${source}`} aria-label={`${tool.name}: ${value.toLocaleString('en')} ${label}`} title={`${label}. Not unique users or confirmed installations.${timing}${saved ? ' Latest refresh unavailable; showing saved counts.' : ''}`}>
    {mobile && `${label}: `}{number(value)}{saved && <span aria-label="Saved data"> *</span>}
  </a>;
}
