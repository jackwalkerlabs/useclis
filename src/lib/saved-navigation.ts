export const directoryStateKey = 'useclis-directory-query';
export const directoryStateEvent = 'useclis-directory-state';
export function savedHref(search: string) {
  const input = new URLSearchParams(search);
  const params = new URLSearchParams();
  for (const key of ['q','category','sort','order','downloads','period']) {
    const value = input.get(key); if (value) params.set(key, value);
  }
  params.set('saved', '1');
  return `/?${params}#directory`;
}
export function openSavedHere() {
  window.history.pushState(null, '', savedHref(window.location.search));
  window.dispatchEvent(new window.PopStateEvent('popstate'));
  document.getElementById('directory')?.scrollIntoView({behavior:'smooth'});
}
