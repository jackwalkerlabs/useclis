import { useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { savedHref, directoryStateEvent, directoryStateKey, openSavedHere } from '../lib/saved-navigation';
export default function SavedLink() {
  const [href, setHref] = useState('/?saved=1#directory');
  useEffect(() => {
    const update = () => {
      let query = window.location.pathname === '/' ? window.location.search : '';
      if (window.location.pathname !== '/') { try { query = window.sessionStorage.getItem(directoryStateKey) ?? ''; } catch {} }
      setHref(savedHref(query));
    };
    update(); window.addEventListener(directoryStateEvent, update); window.addEventListener('popstate', update);
    return () => { window.removeEventListener(directoryStateEvent, update); window.removeEventListener('popstate', update); };
  }, []);
  return <a className="saved-link" aria-label="Saved CLIs" href={href} onClick={event => {
    if (window.location.pathname === '/' && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); openSavedHere(); }
  }}><Bookmark size={15} aria-hidden="true" /><span>Saved CLIs</span></a>;
}
