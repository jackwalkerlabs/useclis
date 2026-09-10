# useclis

A simple directory of GitHub-backed CLIs for agents using the useclis design system. Built with Astro and React, with static pages ready for Cloudflare Workers or Pages.

## Run locally

Use Node 22.22.2 from `.node-version` (the test suite also supports Node 24.15+ or 26+).

```sh
npm ci
npm run dev -- --port 4321
```

Open http://localhost:4321. The app includes a searchable, filterable leaderboard, featured listings, browser-local bookmarks, category pages, 36 CLI pages, and repository charts. No database or runtime API keys are needed.

## Cloudflare

The default `wrangler.jsonc` deploys `dist` as static Workers assets. No adapter or server runtime is necessary.

```sh
npm run build
npx wrangler deploy --dry-run
npm run deploy
```

For Git integration, use build command `npm run build` and deploy command `npx wrangler deploy`. Set `SITE_URL` to your production origin (for example `https://useclis.com`) to generate canonical URLs and the sitemap. Change the Worker name in `wrangler.jsonc` if desired. Authenticate Wrangler in your own terminal for deployment.

Cloudflare Pages also supports the static output: use `npm run build`, output directory `dist`, and Node 22.22.2. The optional `npm run deploy:pages` targets a Pages project named `useclis`.

Reference: [Astro on Cloudflare](https://docs.astro.build/en/guides/deploy/cloudflare/), [Cloudflare static assets](https://developers.cloudflare.com/workers/static-assets/).

## Data and charts

- `src/data/catalog.json`: CLI names, GitHub repositories, command entry points, agent use cases, documentation, features, and example commands. Add or edit CLI listings here.
- `src/data/repositories.json`: GitHub API snapshots of stars, detected core license, language, creation date, and latest default-branch commit date.
- `src/data/activity.json`: 52 weekly commit totals from GitHub's participation endpoint. Small charts show the latest 12 weeks; detail charts offer 12, 26, and 52 weeks. Each small chart uses an independent vertical scale.
- `src/data/star-snapshots.json`: actual daily total-star observations. Collection started September 9, 2026. No historical totals have been invented. A single observation shows “Star history starts today.” Two or more dates show a green/red chart, net change, and percentage change. Windows shorter than 30 days are labeled with their actual start date.
- `public/logos`: locally stored GitHub organization/user avatars. These are repository-owner avatars, not necessarily product logos.

Refresh data manually:

```sh
npm run refresh
```

Set `GITHUB_TOKEN` locally if you need authenticated GitHub API limits. Never expose the token in client code. API failures preserve prior metadata, and builds use checked-in data without requiring GitHub access.

`.github/workflows/refresh-directory.yml` runs this refresh daily after it is pushed to GitHub and Actions is enabled. It commits snapshots to the repository; connect the repository to Cloudflare to publish updated static pages. The workflow needs permission to commit to the default branch. Protected branches may need a PR-based update workflow instead. No remote repository or deployment has been created by this setup.

The initial attempt to obtain historical stargazer timestamps failed: REST returned 401/404, and GraphQL returned empty edges despite a nonzero total. OSS Insight disclosed incomplete recent star-event ingestion, so those historical counts are deliberately not used. Daily total snapshots include both added and removed stars and are the source for net growth.

The previous 100 general software listings and metadata are preserved under `archive/general-directory/`. They are excluded from active pages and data refreshes. The active catalog contains only CLI entries. Browser Harness points to `browser-use/browser-harness`, the dedicated CLI, rather than the Browser Use Python library repository. Repository metrics can cover a monorepo or mirror, not just the listed binary.

Sources: [GitHub repository API](https://docs.github.com/en/rest/repos/repos#get-a-repository), [GitHub statistics API](https://docs.github.com/en/rest/metrics/statistics#get-the-weekly-commit-count), [GitHub stargazers API](https://docs.github.com/en/rest/activity/starring#list-stargazers), [OSS Insight data notice](https://ossinsight.io/).

## Design

`design-system/` contains the useclis tokens, React components, brand guidelines, and interactive CLI examples. The app imports its color, type, spacing, radius, elevation, and motion tokens and its Button component. Fonts are self-hosted Geist and Geist Mono. See the [design system guide](design-system/readme.md) and [third-party materials](THIRD_PARTY.md) for the kit's origin and redistribution status.

The homepage combines featured CLI cards, a searchable leaderboard, and category links. Detail pages show agent use cases, copyable example commands, and source documentation. Phone layouts use a swipeable card rail, compact leaderboard, and wrapped actions. Real Chrome desktop/mobile validation remains pending the CUA existing-profile grant.

The app uses `useclis-saved` for browser bookmarks and imports earlier `openrepo-saved` bookmarks when the new key is absent.

## Validation

```sh
npm test
npm run check
npm run build
npm run check:links
npx wrangler deploy --dry-run
# In another terminal, start the production runtime on a free port:
npx wrangler dev --local --port 50865
node scripts/check-http.mjs http://localhost:50865
```

The tests cover command/repository/task search, category and saved-filter intersections, CLI metadata requirements, numeric ranking, star-window calculations (including losses, short history, and zero baselines), metadata provenance, and local logo availability. Link validation checks generated routes and assets. `sharp` is overridden to `^0.35.4` to avoid the vulnerable version in Wrangler's development dependency tree.

### Functional audit — September 9, 2026

18 automated tests pass. The React interaction suite mounts the real components in jsdom and exercises search/Enter/Explore, every category and sorting mode, bookmarks for every CLI, persistence and storage failures, saved filters, URL restoration and browser-history events, chart ranges and pointer/keyboard input, and every copy-command button with clipboard success/failure. These are component tests, not browser rendering or device tests.

Fixed search submission on Enter, sort preservation in shared links, and restoring filters from browser-history events. Local link checks now cover hash anchors, React hydration modules, button names, duplicate IDs, and image alternatives. The production HTTP checker compares served files byte-for-byte with the current build and verifies the custom 404 response, refusing a URL that belongs to another app.

The Cloudflare local runtime passed the file/404 checks; deployment dry run passed. All 36 documentation destinations and 36 GitHub repository links returned HTTP 200. Real Chrome click-through and mobile visual/touch verification remain pending because CUA refuses attachment without the user-configured existing-profile grant. No deployment was performed.

## Open-source release preparation

The repository is being prepared for its first public release. The app license and redistribution terms for the supplied design bundle are pending; do not treat this checkout as fully licensed yet. See [release/deployment steps](docs/RELEASING.md), [contribution guide](CONTRIBUTING.md), and [third-party materials](THIRD_PARTY.md).

CI validates pull requests and pushes without secrets. The intended production domain is `https://useclis.com`; no repository has been published and no domain deployment has been created.
