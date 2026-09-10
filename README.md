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
- `src/data/cli-source-list.json`: the supplied 200-row source list and its original workflow-support labels. All 200 entries are represented in the active catalog, alongside nine additional CLIs, for 209 total. Entries are matched by repository so additions already in the catalog retain their existing listings. Neither “Not marked in source list” nor “Not assessed” means a tool lacks agent support.
- `src/data/repositories.json`: dated repository metadata and star totals from GitHub.
- `src/data/activity.json`: 52 weekly commit counts per repository.
- `src/data/star-snapshots.json`: daily observations of total stars. Collection began September 9, 2026. No historical totals are invented; a single observation displays its start date without a growth claim.
- `src/data/homebrew-mappings.json`: explicit Homebrew/core formula identities for 77 CLI listings. Mappings are checked against the catalog repository and the formula's upstream URLs. Primary formulae are used where a repository has multiple packages; casks, third-party taps, separately versioned formulae, and additional packages are excluded. Gemini CLI's npm archive identity was verified through the npm package's repository metadata.
- `src/data/homebrew.json`: 30/90/365-day install-on-request events, summed across returned variants including HEAD. Detail pages show these counts with source links and observation/source dates. These are reporting installation events, not unique users. Missing periods show “Unavailable”; unmapped CLIs have no card. Failed provider requests preserve the previous counts and successful timestamp with a visible failure state. Builds use these snapshots without network access.
- `public/logos/`: avatars for active repository owners, which may differ from product logos.

To collect new observations:

```sh
GITHUB_TOKEN=... npm run refresh
npm run build:design-system
```

Provide your own token through the shell or a local secret manager; never commit it. A token is optional, but an unauthenticated full refresh exceeds GitHub's normal hourly API allowance. Failed GitHub requests preserve prior data and return an error. Pending GitHub statistics (HTTP 202) preserve previous activity for a later refresh.

Refresh only Homebrew with `npm run refresh-homebrew` (no API key required). Its source failures are recorded and logged without failing the whole refresh, allowing successful updates and saved-data labels to publish. Invalid configuration or unreadable snapshot files fail the command. The daily workflow commits `src/data/homebrew.json` with the other snapshots. Data comes from the [Homebrew formula API](https://formulae.brew.sh/docs/api/); see [Homebrew analytics](https://docs.brew.sh/Analytics) for coverage. The three rolling windows overlap and must not be added together.

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

Daily automated discovery is implemented separately from submissions. Candidates need 500+ GitHub stars **or** 100+ Homebrew install-on-request events in 30 days, verified executable declarations and documented usage, and passing site validation. Up to ten qualifying additions can publish per UTC day. Run `npm run discover` for a report without changing the catalog. See [discovery setup, evidence rules, and operations](docs/DISCOVERY.md) for Cloudflare scheduling and required credentials.

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

CI validates pushes and pull requests with read-only repository permissions. With the Cloudflare API-token secret and deployment variable configured, successful main builds deploy to useclis.com and verify the live files. The daily refresh workflow commits updated snapshots and explicitly triggers the same validation/deployment pipeline. See [deployment setup](docs/RELEASING.md#automatic-deployment-from-main) for credentials, activation, and rollback.

Original app code and the AI-generated design bundle are [MIT-licensed](LICENSE). Fonts, icons, avatars, and dependencies retain their separate [third-party terms](THIRD_PARTY.md).

## GitHub owner profiles

Profiles follow the supplied founder-page reference: identity and profile actions, four summary cards, an interactive purple area chart, CLI cards, and pastel discovery rails on wide screens. On phones, metrics use two columns and CLI cards stack. The Owners navigation and each CLI’s “By” link lead into the profiles. Share copies the profile URL and offers a selectable URL when clipboard access fails.

`src/data/profiles.json` stores public profile snapshots; `public/avatars/` stores their local avatars. Run `npm run refresh-profiles` to update them, or `npm run refresh-profiles -- --missing` to fetch new owners only. The full `npm run refresh` includes profile refreshes.

Activity combines matching UTC week dates across available listed repositories and labels missing coverage. Profile pages are generated for every owner in the current catalog; refresh profiles after adding an owner.

## Package and binary download statistics

The leaderboard has a download-source selector and independent source-specific sorts. Detail pages show each mapped source with counts, source links, observation dates, and saved-data/unavailable states. Sources are never combined into total installs or unique users. The activity date dropdown controls activity only; package ranking uses 30 days, while GitHub binary ranking is explicitly cumulative.

- `src/data/download-mappings.json`: 32 npm package mappings, 27 PyPI package mappings, and 10 GitHub binary-asset mappings. These are deliberately curated, not inferred from similar names. npm mappings are verified against registry repository metadata and executable declarations; PyPI mappings against project repository URLs. GitHub mappings specify anchored filename patterns reviewed against actual release assets. Unverified aliases are omitted. Add mappings explicitly when expanding coverage; automated CLI discovery does not infer them.
- `src/data/downloads.json`: compact public snapshots consumed by static builds. npm and PyPI windows cover complete 30/90/365-day intervals ending on the reported source date. Missing days or insufficient history make a window unavailable, not zero. npm counts cover the named CLI package, excluding separate platform packages; both registries can include automated, dependency, and repeated downloads.
- `src/data/download-history.json`: collector history, not shipped as a public route. PyPI daily observations accumulate beyond the provider's 180-day retention so an annual count can eventually be shown. GitHub keeps daily cumulative observations; counter decreases and deleted assets mean these must not be treated as an installation-event series.

Run `npm run refresh-downloads` to refresh these sources; it also runs in `npm run refresh`. npm and PyPI Stats need no credentials. GitHub uses `GITHUB_TOKEN` when supplied (the existing Actions token is passed by both workflows). Requests are sequential and each mapped source is attempted at most once per UTC day, including failures, to respect daily caching and provider rate limits. Failed requests preserve the successful counts, date, and history. Invalid configuration or unreadable JSON fails the command. Both automated workflows commit download snapshots and collector history with the other data.

GitHub collection paginates published, non-prerelease releases and matches selected CLI binary assets. Checksums, signatures, source archives, and unrelated products are excluded. The displayed cumulative count covers currently available matching assets; deleted assets cease to contribute. GitHub counts can overlap package-manager downloads and must not be added to them.

Sources: [npm download-count API](https://github.com/npm/registry/blob/main/docs/download-counts.md), [PyPI Stats API](https://pypistats.org/api/), and [GitHub release assets API](https://docs.github.com/en/rest/releases/assets).
