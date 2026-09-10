import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { ArrowUpRight, Check, GitFork, Plus, Terminal, X } from 'lucide-react';
import { categories } from '../data/tools';
import { submissionBody, submissionIssueUrl } from '../lib/submission';

interface Props { submissionRepo?: string }

export default function SubmitCLI({ submissionRepo = '' }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const destination = /^[\w.-]+\/[\w.-]+$/.test(submissionRepo) ? submissionRepo : '';

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  function close() {
    dialog.current?.close();
    setOpen(false);
    trigger.current?.focus();
  }

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? '').trim();
    const repoInput = event.currentTarget.elements.namedItem('repository') as HTMLInputElement;
    let repo: URL;
    try {
      repo = new URL(value('repository'));
      if (repo.protocol !== 'https:' || repo.hostname !== 'github.com' || repo.username || repo.password || repo.port || !/^\/[\w.-]+\/[\w.-]+\/?$/.test(repo.pathname)) throw new Error();
    } catch {
      repoInput.setCustomValidity('Enter a GitHub repository URL, like https://github.com/owner/cli.');
      repoInput.reportValidity();
      return;
    }
    const submission = {
      name: value('name'),
      repository: `https://github.com${repo.pathname.replace(/\/$/, '')}`,
      command: value('command'),
      category: value('category'),
      docs: value('docs'),
      useCase: value('useCase'),
      handle: value('handle'),
    };
    if (destination) {
      const url = submissionIssueUrl(destination, submission);
      window.location.assign(url.href);
    } else {
      const url = URL.createObjectURL(new Blob([submissionBody(submission)], { type: 'text/markdown;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'useclis-submission.md';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('Draft downloaded. It has not been submitted for review.');
    }
  }

  return <>
    <button ref={trigger} type="button" className="button primary header-cta" aria-haspopup="dialog" onClick={() => { dialog.current?.showModal(); setOpen(true); setNotice(''); }}>
      <Plus size={14} aria-hidden="true" /> Submit your CLI
    </button>
    <dialog ref={dialog} className="submission-dialog" aria-labelledby="submission-title" aria-describedby="submission-description" onCancel={event => { event.preventDefault(); close(); }} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close(); } }}>
      <div className="submission-shell">
        <header className="submission-header">
          <div className="submission-title-row"><h2 id="submission-title">Submit your CLI</h2><span className="submission-free"><span className="status-dot" /> Free to list</span></div>
          <p id="submission-description">Put your command-line tool in the hands of agents.</p>
          <button type="button" className="icon-button submission-close" aria-label="Close submission" onClick={close}><X size={18} /></button>
        </header>
        <form className="submission-form" onSubmit={submit} onChange={() => setNotice('')}>
          <div className="submission-fields">
            <div className="submission-field"><label htmlFor="cli-repository">1. GitHub repository</label><div className="submission-input-icon"><GitFork size={17} aria-hidden="true" /><input id="cli-repository" name="repository" type="url" required autoFocus maxLength={200} placeholder="https://github.com/you/your-cli" onInput={event => event.currentTarget.setCustomValidity('')} /></div><p>Link to the public repository where your CLI lives.</p></div>
            <div className="submission-guidance"><Terminal size={18} aria-hidden="true" /><div><strong>A CLI that agents can use.</strong><p>Include a working command, public documentation, and a clear task an agent can accomplish with your tool.</p></div></div>
            <fieldset className="submission-group"><legend>2. The essentials</legend><div className="submission-columns"><div className="submission-field"><label htmlFor="cli-name">CLI name</label><input id="cli-name" name="name" required pattern=".*\S.*" maxLength={60} placeholder="Your CLI" /></div><div className="submission-field"><label htmlFor="cli-command">Command</label><input id="cli-command" name="command" required pattern=".*\S.*" maxLength={80} placeholder="your-cli" className="submission-mono" /></div></div><div className="submission-field"><label htmlFor="cli-category">Category</label><select id="cli-category" name="category" required defaultValue=""><option value="" disabled>Choose a category</option>{categories.map(category => <option key={category}>{category}</option>)}</select></div><div className="submission-field"><label htmlFor="cli-docs">Documentation URL</label><input id="cli-docs" name="docs" type="url" pattern="https?://.*" required maxLength={240} placeholder="https://your-cli.dev/docs" /></div></fieldset>
            <div className="submission-field"><label htmlFor="cli-use-case">3. What can an agent do with it?</label><textarea id="cli-use-case" name="useCase" required minLength={20} maxLength={500} rows={3} placeholder="For example: search a codebase and return structured JSON results for an agent to work with." /><p>A concrete use case helps people find the right tool.</p></div>
            <div className="submission-field"><label htmlFor="cli-handle">Your GitHub or X handle <span>(optional)</span></label><input id="cli-handle" name="handle" maxLength={80} placeholder="@username" autoComplete="off" /></div>
            <div className="submission-listing"><span className="submission-check"><Check size={14} /></span><div><strong>Directory listing</strong><p>A CLI profile with your repository, documentation, and command. Submissions are reviewed before appearing in the directory.</p></div><strong>Free</strong></div>
          </div>
          <footer className="submission-footer"><div><p>{destination ? 'Submissions are public GitHub issues.' : 'Submission inbox coming soon.'}</p><span>{destination ? 'Sign in to GitHub, then review and create your issue.' : 'Save a draft of your CLI details for now.'}</span></div><button type="submit" className="button primary">{destination ? 'Continue to GitHub' : 'Download draft'}<ArrowUpRight size={15} aria-hidden="true" /></button>{notice && <p className="submission-notice" role="status">{notice}</p>}</footer>
        </form>
      </div>
    </dialog>
  </>;
}
