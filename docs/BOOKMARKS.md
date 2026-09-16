# Saved CLIs

Saved is a composable directory filter. Both the header link and homepage shortcut retain query, category, sort, download source and date range. The URL records these controls; entering Saved mode adds a history entry, so Back restores the prior directory view. Reload preserves the URL state.

Tool pages offer Save/Unsave beside the primary links. Bookmarks use browser-local storage, without an account, and synchronize between hydrated components and browser tabs. Legacy `openrepo-saved` values migrate to `useclis-saved`. Unknown string IDs are retained in storage but cannot create catalog rows. Storage failures leave per-page state usable and announce that persistence is unavailable.

A tab's last directory query is remembered in session storage so the detail-page Saved link returns with the same filter context. A direct detail visit without remembered context uses the default Saved view. If session storage is blocked, homepage entry points still retain the current URL; detail pages fall back to the default Saved view.
