import { useEffect, useState } from 'react';
import { snapshotFreshness, freshnessLabels, type Snapshot } from '../lib/freshness.mjs';
export default function SnapshotFreshness({ snapshot, label, provider = 'github', renderedAt }: { snapshot?: Snapshot | null; label: string; provider?: string; renderedAt: number }) {
  const [now, setNow] = useState(renderedAt);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const state = snapshotFreshness(snapshot, provider, now);
  const date = (value: string) => new Date(value).toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  const valid = (value?: string | null): value is string => !!value && Number.isFinite(Date.parse(value));
  return <p className="snapshot-freshness" data-freshness={state} style={{ fontSize: '13px', lineHeight: 1.6 }}>
    <strong>{label}: {freshnessLabels[state]}.</strong>{' '}
    {valid(snapshot?.checkedAt) && <>Last successful check <time dateTime={snapshot.checkedAt}>{date(snapshot.checkedAt)}</time>. </>}
    {valid(snapshot?.attemptedAt) && snapshot.status !== 'ok' && <>Last attempt <time dateTime={snapshot.attemptedAt}>{date(snapshot.attemptedAt)}</time>. </>}
    <a href="/about/#freshness">Freshness policy ↗</a>
  </p>;
}
