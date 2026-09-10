import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
export default function ShareProfile() {
  const [status, setStatus] = useState('');
  const [manual, setManual] = useState(false);
  const [url, setUrl] = useState('');
  async function share() {
    const href = `${window.location.origin}${window.location.pathname}`;
    setUrl(href);
    try { await navigator.clipboard.writeText(href); setStatus('Link copied'); setManual(false); }
    catch { setStatus('Copy this profile link'); setManual(true); }
  }
  return <div className="profile-share"><button className="button secondary" onClick={share}>{status === 'Link copied' ? <Check size={16} /> : <Share2 size={16} />}Share</button><span role="status">{status}</span>{manual && <input aria-label="Profile link" readOnly value={url} onFocus={event => event.currentTarget.select()} />}</div>;
}
