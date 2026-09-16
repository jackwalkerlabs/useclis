/** Retry only pending GitHub calculations after giving the full sweep time to finish. */
export async function refreshWithDeferredRetries(entries, refresh, { pause = ms => new Promise(resolve => setTimeout(resolve, ms)), notice = console.log } = {}) {
  let pending = [];
  for (const entry of entries) if (await refresh(entry)) pending.push(entry);
  for (let retry = 1; retry <= 2 && pending.length; retry++) {
    notice(`GitHub activity: ${pending.length} pending; deferred retry ${retry}/2 after 30 seconds.`);
    await pause(30_000);
    const next = [];
    for (const entry of pending) if (await refresh(entry)) next.push(entry);
    pending = next;
  }
}
