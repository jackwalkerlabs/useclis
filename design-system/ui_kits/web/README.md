# useclis web kit

Interactive examples: Home, Directory with search and category filters, and CLI details. The header also switches the preview theme.

Serve the repository root with a local static HTTP server and open `design-system/ui_kits/web/index.html`. JSX loading requires HTTP rather than a `file:` URL. The previews fetch pinned React and Babel scripts from a CDN and self-host Inconsolata; the production app bundles React and self-hosts its fonts.

`data.js` is generated from `src/data/catalog.json` and `src/data/repositories.json`. Run `npm run build:design-system` to refresh the component bundle and preview snapshots. No commands are executed by the examples.
