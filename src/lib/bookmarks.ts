import { useEffect, useState } from 'react';
const key = 'useclis-saved';
const eventName = 'useclis-bookmarks';
function readSaved(): string[] {
  try {
    const current = localStorage.getItem(key);
    const value: unknown = JSON.parse(current ?? localStorage.getItem('openrepo-saved') ?? '[]');
    const slugs = Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string'))] : [];
    if (current === null) localStorage.setItem(key, JSON.stringify(slugs));
    return slugs;
  } catch { return []; }
}
export function useBookmarks() {
  const [saved, setSaved] = useState<string[]>([]);
  useEffect(() => {
    setSaved(readSaved());
    const local = (event: Event) => setSaved((event as CustomEvent<string[]>).detail);
    const remote = (event: StorageEvent) => { if (event.key === key || event.key === null) setSaved(readSaved()); };
    window.addEventListener(eventName, local); window.addEventListener('storage', remote);
    return () => { window.removeEventListener(eventName, local); window.removeEventListener('storage', remote); };
  }, []);
  function toggleSaved(slug: string) {
    const next = saved.includes(slug) ? saved.filter(item => item !== slug) : [...saved, slug];
    let persisted = true;
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { persisted = false; }
    setSaved(next);
    window.dispatchEvent(new window.CustomEvent(eventName, { detail: next }));
    return { isSaved: next.includes(slug), persisted };
  }
  return { saved, toggleSaved };
}
