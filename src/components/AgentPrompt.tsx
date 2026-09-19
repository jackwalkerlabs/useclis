import { useRef, useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';
import { Button } from '../../design-system/components/core/Button.jsx';
import { agentPrompt } from '../lib/agent-prompt';
import type { HomepageExample } from '../lib/homepage-examples';

export default function AgentPrompt({ siteUrl, examples = [] }: { siteUrl?: string; examples?: HomepageExample[] }) {
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
      <div><h2 id="agent-prompt-title"><Terminal size={17} aria-hidden="true" />Give your agent the catalog</h2><p>Copy a prompt to discover tools for your task.</p></div>
      <Button size="sm" type="button" onClick={copy}>{message.startsWith('Prompt copied') ? <Check size={14} /> : <Copy size={14} />}Copy agent prompt</Button>
    </div>
    <p className="agent-prompt-why">Coding agents already work in a terminal. A catalog of mature CLIs gives them inspectable commands and official docs instead of a bespoke integration for every task.</p>
    {examples.length > 0 && <div className="agent-prompt-examples">
      <h3>What your agent finds</h3>
      <ol>{examples.map(({ task, tool }) => <li key={tool.slug}>
        <p className="agent-prompt-task">“{task}”</p>
        <p className="agent-prompt-tool"><span aria-hidden="true">→</span> <a href={`/tools/${tool.slug}/`}>{tool.name}</a> <span>{tool.category}</span></p>
        <code>{tool.example}</code>
        <a className="agent-prompt-docs" href={tool.docs} target="_blank" rel="noreferrer">Official docs<span className="sr-only"> for {tool.name}</span> ↗</a>
      </li>)}</ol>
      <p className="agent-prompt-caveat">Examples are starting points, checked against each listing. A listing is not a guarantee that a tool is safe for your task or works with every agent.</p>
    </div>}
    <div className="agent-prompt-resources"><span>Agent catalog:</span><details ref={preview}><summary>View prompt</summary><textarea ref={text} aria-label="Agent prompt" value={prompt} readOnly rows={8} /></details><a href="/llms.txt">llms.txt ↗</a><a href="/llms-full.txt">Full text ↗</a><a href="/clis.json">JSON ↗</a></div>
    {message && <p className="agent-prompt-status" role="status">{message}</p>}
  </section>;
}
