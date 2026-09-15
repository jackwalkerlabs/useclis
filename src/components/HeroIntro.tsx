import { Check } from 'lucide-react';

export default function HeroIntro({ count }: { count: number }) {
  return <>
    <a href="/about/" className="source-badge"><span className="verified-disc"><Check size={10} strokeWidth={3} /></span> Repository data from GitHub</a>
    <h1>CLIs for humans<br />and coding agents</h1>
    <p className="hero-intro">Discover {count.toLocaleString('en-US')} command-line tools by task. Browse here, or let your agent read the catalog.</p>
  </>;
}
