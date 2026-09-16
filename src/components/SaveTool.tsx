import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { useBookmarks } from '../lib/bookmarks';
export default function SaveTool({slug,name}: {slug:string;name:string}) {
  const {saved,toggleSaved} = useBookmarks();
  const [message,setMessage] = useState('');
  const isSaved = saved.includes(slug);
  return <div className="detail-save"><button type="button" className="button secondary" aria-label={`${isSaved ? 'Unsave' : 'Save'} ${name}`} aria-pressed={isSaved} onClick={() => {
    const result=toggleSaved(slug);
    setMessage(result.persisted ? `${name} ${result.isSaved ? 'saved' : 'removed from saved tools'}` : `${name} ${result.isSaved ? 'saved' : 'removed'} for this page only. Browser storage is unavailable.`);
  }}><Bookmark size={16} aria-hidden="true" fill={isSaved?'currentColor':'none'}/>{isSaved?'Saved':'Save CLI'}</button><span role="status" className="detail-save-status">{message}</span></div>;
}
