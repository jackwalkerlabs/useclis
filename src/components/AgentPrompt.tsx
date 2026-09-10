import { useRef, useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';
import { Button } from '../../design-system/components/core/Button.jsx';
import { agentPrompt } from '../lib/agent-prompt';

export default function AgentPrompt({ siteUrl }: { siteUrl?: string }) {
  const prompt = agentPrompt(siteUrl);
  const [message, setMessage] = useState('');
  const preview = useRef<HTMLDetailsElement>(null);
  const text = useRef<HTMLTextAreaElement>(null);
  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setMessage('Prompt copied. Paste it into your coding agent.');
    } catch {
      if (preview.current) preview.current.open = true;
      text.current?.focus();
      text.current?.select();
      setMessage('Copy the selected prompt, then paste it into your coding agent.');
    }
  }
  return <section className="agent-prompt" aria-labelledby="agent-prompt-title">
    <div className="agent-prompt-heading">
      <div><h2 id="agent-prompt-title"><Terminal size={17} aria-hidden="true" />Let your agent find the right CLI</h2><p>Copy this prompt into your coding agent to find tools for your current task.</p></div>
      <Button size="sm" type="button" onClick={copy}>{message.startsWith('Prompt copied') ? <Check size={14} /> : <Copy size={14} />}Copy agent prompt</Button>
    </div>
    <div className="agent-prompt-resources"><details ref={preview}><summary>View prompt</summary><textarea ref={text} aria-label="Agent prompt" value={prompt} readOnly rows={8} /></details><a href="/llms.txt">llms.txt ↗</a><a href="/clis.json">CLI catalog (JSON) ↗</a></div>
    {message && <p className="agent-prompt-status" role="status">{message}</p>}
  </section>;
}
