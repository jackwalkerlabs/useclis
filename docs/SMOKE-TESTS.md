# Launch smoke tests

Run **Smoke test production** in GitHub Actions before a Reddit or Show HN post:

```sh
gh workflow run production-smoke.yml --ref main
```

Open that run and wait for it to pass before posting. Failures name the page/flow and viewport; download the `production-smoke` artifact for the HTML report, failure screenshots, and traces. The suite performs no submission, account login, or installation of catalog tools. Saved CLIs live only in its disposable browser contexts.

The same suite runs against the built site for every PR, and against production after an actual deployment in **Validate site**. A superseded commit skips deployment and its production smoke step. CI verifies `/build-info.json` against the deployed commit, rather than silently checking an older build. The local route/asset check still runs before deployment; the browser smoke suite replaces the exhaustive production file crawl with a small set of critical flows.

## Coverage

Twelve tests cover four flows at desktop (1280px), phone (390px) and small phone (320px) widths:

- The homepage's count agrees with `clis.json`, exact-name search finds ripgrep, category filters agree with catalog data, and the viewport has no horizontal overflow.
- A representative detail page exposes its repository/docs links; saving, navigating, reloading, and removing a CLI work.
- The submission form opens and closes by pointer and keyboard, including the phone header. The test never continues to GitHub or creates an issue.
- `llms.txt`, `llms-full.txt`, and `clis.json` contain real catalog content; a missing route returns HTTP 404. Deployment runs also check the exact built commit.
- The [agent API contract](AGENT-API.md) passes against the served files: correct status and content type, parseable and untruncated output, every listing exactly once, and a JSON field-extraction task resolving to jq. This HTTP-only test runs once, at desktop width.

Assertions use stable identities and current endpoint data, not star rankings or fixed catalog sizes. Each test has a 45-second timeout and the suite is bounded to three minutes, with one retry in CI for transient deployment propagation. This is Chromium viewport coverage, not physical-device or Safari testing.

## Running outside CI

On a machine where launching a disposable test browser is appropriate, install it once:

```sh
npm ci
npx playwright install chromium
npm run test:smoke
```

The default target is `https://useclis.com`. Override `SMOKE_BASE_URL` to check another deployed preview. To test a local build, `npm run build` then `SMOKE_LOCAL=1 npm run test:smoke` starts its own preview server on port 4179; it refuses to reuse an unrelated server already on that port. View reports with `npx playwright show-report artifacts/smoke-report`.

During agent sessions that require reusing the user's existing Chrome process, run the automated browser suite in GitHub Actions and use the approved existing browser/Orca page for local visual checks. Do not launch a separate local Chrome profile to bypass that preference.
