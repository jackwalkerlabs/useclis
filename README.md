# useclis

A directory of command-line tools for agents, built with Astro and React. Search by command, task, or repository; explore dated GitHub statistics; and save CLIs in your browser. The app builds to static files for Cloudflare Workers or Pages.

## Run locally

Use Node 22.22.2 from `.node-version`, or another version allowed by `package.json`.

```sh
npm ci
npm run dev -- --port 4321
```

Open http://localhost:4321. Builds use checked-in data, so no database or API keys are required.

## Edit the directory

- `src/data/catalog.json`: CLI entries, commands, categories, capabilities, examples, and documentation links.
- `src/data/cli-source-list.json`: the original 100-row source list and its workflow-support labels. All 100 entries are represented in the active catalog, alongside 15 additional CLIs. “Not marked in source list” does not mean a tool lacks agent support.
- `src/data/repositories.json`: dated repository metadata and star totals from GitHub.
- `src/data/activity.json`: 52 weekly commit counts per repository.
- `src/data/star-snapshots.json`: daily observations of total stars. Collection began September 9, 2026. No historical totals are invented; a single observation displays its start date without a growth claim.
- `public/logos/`: avatars for active repository owners, which may differ from product logos.

To collect new observations:

```sh
GITHUB_TOKEN=... npm run refresh
npm run build:design-system
```

Provide your own token through the shell or a local secret manager; never commit it. A token is optional, but an unauthenticated full refresh exceeds GitHub's normal hourly API allowance. Failed requests preserve prior data and return an error. Pending GitHub statistics (HTTP 202) preserve previous activity for a later refresh.

Charts represent repository activity, including any other software in the same repository. Star changes include added and removed stars. Small commit charts use independent vertical scales, and the current week may be incomplete.

`archive/` preserves earlier catalog data, unused avatars, and old font notices. It is excluded from the deployed site. See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution requirements.

Sources: [GitHub repository API](https://docs.github.com/en/rest/repos/repos#get-a-repository) and [weekly participation statistics](https://docs.github.com/en/rest/metrics/statistics#get-the-weekly-commit-count).

## Discovery from a coding agent

The homepage has a copyable prompt that asks an agent to find CLIs for the current task and verify their official documentation. The prompt uses `SITE_URL`, falling back to `https://useclis.com`. Clipboard failures reveal and select the prompt for manual copying.

Three static resources are generated from the directory's catalog on every build:

- `/llms.txt`: short agent guide and catalog links, following the [llms.txt proposal](https://llmstxt.org/).
- `/llms-full.txt`: every CLI in searchable plain-text Markdown, including commands, examples, use cases, and documentation links.
- `/clis.json`: versioned JSON with `categories` and a `tools` array, including stable slugs, source URLs, and dated repository snapshots.

All can be fetched with `curl`; no JavaScript, account, or API key is required. After deployment:

```sh
curl -fsSL https://useclis.com/llms.txt
curl -fsSL https://useclis.com/llms-full.txt
# With jq installed, search descriptions, use cases, and features locally:
curl -fsSL https://useclis.com/clis.json | jq --arg q 'browser' '.tools[] | select([.name, .command, .category, .description, .useCase, .agentUse, (.features | join(" "))] | join(" ") | ascii_downcase | contains($q | ascii_downcase)) | {name, command, url, docs}'
```

These files return the full catalog; query parameters do not filter them. Agents search the downloaded text or JSON locally. The homepage's `?q=` filter runs in the browser. `llms.txt` is linked from the HTML head and the Cloudflare `Link` response header; it does not guarantee automatic discovery by every agent.

## Design system

`design-system/` is AI-generated for useclis and belongs to this repository under [MIT](LICENSE). It contains tokens, React components, guidelines, and a standalone CLI preview. Inconsolata is self-hosted; commands and metrics use system monospace fonts. Third-party assets retain their [license notices](THIRD_PARTY.md).

After editing components, catalog data, or repository snapshots, run `npm run build:design-system`. CI checks that generated previews match their sources. See the [design guide](design-system/readme.md) for details. Homepage type sizes live in `src/typography.css`, loaded after layout and mobile rules.

## CLI submissions

The header form prepares a public GitHub issue. Visitors review and submit it on GitHub; the site does not request OAuth access or post on their behalf. Submissions default to `jackwalkerlabs/useclis`, which must exist with Issues enabled.

Set the build variable `PUBLIC_SUBMISSIONS_REPO=owner/repository` to use a different destination. Set it explicitly to an empty string to offer Markdown draft downloads instead. The form preserves entered details when dismissed during the current page visit.

Bookmarks stay in local browser storage. Existing bookmarks from the app's earlier name are migrated automatically.

## Validate

```sh
npm run check
npm test
npm run check:design-system
npm run build
npm run check:links
npx wrangler deploy --dry-run
```

Tests cover catalog coverage, filtering, bookmarks, charts, command copying, submissions, and data-refresh failure handling. Component tests use jsdom and do not prove visual rendering or native browser behavior. Check desktop/mobile layout, keyboard navigation, and the submission dialog in a real browser before launch.

For a production HTTP check, run `npx wrangler dev --local --port 50865` in another terminal, then `node scripts/check-http.mjs http://localhost:50865`. The checker verifies exact build contents and the custom 404 page.

## Publish and deploy

Set `SITE_URL=https://useclis.com` in the build environment to generate canonical URLs and a sitemap. The Worker serves `dist` as static assets:

```sh
SITE_URL=https://useclis.com npm run build
npx wrangler deploy --dry-run
```

`npm run deploy` builds and deploys the Worker. `npm run deploy:pages` targets a Pages project named `useclis`. Authenticate with Cloudflare in your own terminal. See [release and deployment instructions](docs/RELEASING.md) before publishing the repository or domain.

CI validates pushes and pull requests with read-only repository permissions. The daily refresh workflow updates snapshots and the design preview, validates the result, and commits using the repository token. Protected branches may require a PR-based update flow; verify that snapshot commits trigger the intended Cloudflare build.

Original app code and the AI-generated design bundle are [MIT-licensed](LICENSE). Fonts, icons, avatars, and dependencies retain their separate [third-party terms](THIRD_PARTY.md).
