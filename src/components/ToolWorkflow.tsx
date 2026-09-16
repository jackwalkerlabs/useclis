import { useRef, useState } from 'react';
import { toolWorkflowPrompt, type AgentProfile } from '../lib/tool-workflows';
export default function ToolWorkflow({ name, docs, profile }: { name: string; docs: string; profile: AgentProfile }) {
  const [message, setMessage] = useState('');
  const preview = useRef<HTMLDetailsElement>(null);
  const text = useRef<HTMLTextAreaElement>(null);
  const prompt = toolWorkflowPrompt(name, docs, profile);
  async function copy() {
    try { await navigator.clipboard.writeText(prompt); setMessage('Prompt copied. Paste it into your agent.'); }
    catch { if (preview.current) preview.current.open = true; text.current?.focus(); text.current?.select(); setMessage('Copy the selected prompt.'); }
  }
  return <section className="tool-workflow" aria-label={`${name} workflow`}>
    <h2>Try a useful task</h2><h3>{profile.workflow.title}</h3>
    <p><strong>Before you start:</strong> {profile.workflow.setup.text} <a href={profile.workflow.setup.source}>Setup instructions ↗</a></p>
    <p>{profile.workflow.context}</p>
    <pre><code>{profile.workflow.commands.join('\n')}</code></pre>
    <p><strong>Expected result:</strong> {profile.workflow.expected.text} <a href={profile.workflow.expected.source}>Command reference ↗</a></p>
    <button className="button primary" onClick={copy}>Copy prompt for this CLI</button>
    <details ref={preview}><summary>View prompt</summary><textarea ref={text} aria-label={`Prompt for ${name}`} value={prompt} readOnly rows={10} /></details>
    <p role="status">{message}</p>
  </section>;
}
