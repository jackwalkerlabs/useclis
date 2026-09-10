import { number, type Tool } from '../data/tools';

export default function BrewInstalls({ tool, mobile = false }: { tool: Tool; mobile?: boolean }) {
  const snapshot = tool.homebrew;
  const count = snapshot?.counts['30d'];
  const label = mobile ? <>Brew · 30d: </> : null;
  if (count == null) return <span className={mobile ? 'mobile-brew' : 'brew-count'} title="Homebrew install data unavailable">{label}—<span className="sr-only"> Homebrew install data unavailable</span></span>;
  const checked = snapshot?.checkedAt ? ` Checked ${new Date(snapshot.checkedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}.` : '';
  const saved = snapshot?.status === 'error' ? ' Latest refresh unavailable; showing saved counts.' : '';
  return <a className={mobile ? 'mobile-brew' : 'brew-count'} href={`/tools/${tool.slug}/#homebrew`} aria-label={`${tool.name}: ${count.toLocaleString('en')} Homebrew installs over 30 days. View installation statistics.`} title={`${count.toLocaleString('en')} explicitly requested installation events over 30 days, from Homebrew installations that report analytics. Not unique users or downloads across all package managers.${checked}${saved}`}>
    {label}{number(count)}{saved && <span aria-label="Saved data"> *</span>}
  </a>;
}
