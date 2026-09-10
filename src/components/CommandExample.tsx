import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
export default function CommandExample({ command }: { command: string }) {
  const [message, setMessage] = useState('');
  const code = useRef<HTMLElement>(null);
  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(''), 2500); return () => clearTimeout(timer); }, [message]);
  async function copy() {
    try { await navigator.clipboard.writeText(command); setMessage('Copied'); }
    catch {
      const selection = window.getSelection();
      if (code.current && selection) { const range = document.createRange(); range.selectNodeContents(code.current); selection.removeAllRanges(); selection.addRange(range); }
      setMessage('Select and copy the command');
    }
  }
  return <div className="command-example"><div><span aria-hidden="true">$</span><code ref={code}>{command}</code></div><button onClick={copy} className="icon-button" aria-label="Copy example command">{message === 'Copied' ? <Check size={16} /> : <Copy size={16} />}</button><span className="command-copy-status" role="status">{message}</span></div>;
}
