import { useRef, useState } from 'react';
import { ArrowUpRight, Check, Copy, Terminal } from 'lucide-react';
import { Button } from '../../design-system/components/core/Button.jsx';
import { agentPrompt } from '../lib/agent-prompt';
import type { HomepageExample } from '../lib/homepage-examples';

export default function AgentPrompt({ siteUrl, examples = [] }: { siteUrl?: string; examples?: HomepageExample[] }) {
  const prompt = agentPrompt(siteUrl);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState(0);
  const example = examples[Math.min(selected, examples.length - 1)];
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
      <div><h2 id="agent-prompt-title"><Terminal size={17} aria-hidden="true" />Give your agent the catalog</h2><p>Your agent finds mature CLIs by task, with real commands and official docs, instead of a custom integration for every job.</p></div>
      <Button size="sm" type="button" onClick={copy}>{message.startsWith('Prompt copied') ? <Check size={14} /> : <Copy size={14} />}Copy agent prompt</Button>
    </div>
    {example && <div className="agent-prompt-examples">
      <div className="agent-prompt-chips" role="group" aria-label="Example tasks">{examples.map((item, index) => <button key={item.tool.slug} type="button" aria-pressed={item === example} onClick={() => setSelected(index)}>{item.label}</button>)}</div>
      <div className="agent-prompt-result" aria-live="polite">
        <p><span className="agent-prompt-task">“{example.task}”</span> <span aria-hidden="true">→</span> <a href={`/tools/${example.tool.slug}/`}>{example.tool.name}</a> <a className="agent-prompt-docs" href={example.tool.docs} target="_blank" rel="noreferrer">Docs<span className="sr-only"> for {example.tool.name}</span><ArrowUpRight size={12} aria-hidden="true" /></a></p>
        <code><span aria-hidden="true">$ </span>{example.tool.example}</code>
      </div>
    </div>}
    <div className="agent-prompt-resources"><span className="agent-prompt-caveat">Examples are illustrative; a listing isn’t a guarantee a tool is safe for your task.</span><details ref={preview}><summary>View prompt</summary><textarea ref={text} aria-label="Agent prompt" value={prompt} readOnly rows={8} /></details><a href="/llms.txt">llms.txt ↗</a><a href="/llms-full.txt">Full text ↗</a><a href="/clis.json">JSON ↗</a></div>
    {message && <p className="agent-prompt-status" role="status">{message}</p>}
  </section>;
}
