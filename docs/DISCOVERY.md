# Automatic CLI discovery

Cloudflare Worker `useclis-discovery` runs daily at **07:43 UTC** and dispatches the GitHub **Discover and publish CLIs** workflow on main. GitHub performs discovery, records evidence in Git, refreshes metadata, validates the expanded site, commits qualifying additions, and dispatches the existing production pipeline. There is no public HTTP trigger. The website remains static.

## Admission rules

`discovery/config.json` configures the starting thresholds: **500 GitHub stars OR 100 Homebrew install-on-request events in 30 days**, with at most **10 additions per UTC day** across reruns. These are adoption filters, not compatibility or safety certifications. Homebrew counts reporting installation events, not unique users. Absence from Homebrew does not block the GitHub route. Admission uses current provider responses, never cached old counts.

A candidate must also have:

- A canonical public repository that is not archived, disabled, forked, or a template, and is not already listed or rejected.
- A description explicitly identifying terminal functionality and a use case that matches an existing category. Possible GUI launchers and ambiguous classifications are held.
- Package evidence for the executable: npm `bin` plus an existing target; Python `project.scripts` or Poetry scripts plus a module file; a Cargo binary target plus its source; or Homebrew's executable metadata/literal `bin.install` declaration.
- A matching installation instruction and an invocation copied from official repository documentation. Homebrew's official formula page can supply installation instructions. Help/version, authentication, self-update, and GUI-opening examples do not qualify as useful terminal operations.

No discovered packages, install scripts, Ruby formulae, or example commands are executed. TOML and JSON are parsed as data. The first implementation uses deterministic extraction, with no model key or model-generated capability claims. Descriptions are copied from the repository and features are limited to the verified command-line interface. More detailed claims require editorial evidence.

The scanner checks up to eight manifests (root or shallow package directories) and four README/usage/installation documents per candidate. Generated npm binaries absent from the source tree, dynamic Python setup scripts, unsupported ecosystems, documentation only on external websites, complex shell examples, and unclear use cases are held for later review. This is deliberately bounded coverage, not an exhaustive inventory or proof that a command works on every machine.

## Discovery and records

Each run reads three GitHub searches and a rotating slice of Homebrew/core's 30-day install-on-request report, then evaluates up to 40 candidates. GitHub searches rotate through ten pages sorted by update time; Homebrew rotates through qualifying formula names. Neither source guarantees complete coverage. Identity uses GitHub repository URLs from formula source archives/head URLs, never fuzzy package-name matching. Homebrew responses older than seven days are excluded; global report failure stops the run.

`discovery/state.json` stores candidate status, check time, admission reason, observed counts, and source evidence. Repository source URLs are pinned to the inspected commit. Homebrew evidence includes the source generation date. Held candidates are eligible for another check after 30 days. A `rejected` status suppresses future consideration until manually changed. Existing accepted listings are never automatically removed because adoption later drops.

Provider errors fail the run before applying discovery results. After application, metadata or validation failures prevent any commit or deployment. Discovery and daily snapshot updates share a concurrency lock. A concurrent human push causes the bot push to fail; it never force-pushes or rebases unvalidated data. Rerun the workflow against current main to recover. CI dispatch is repeated even on an unchanged rerun so interrupted publication can recover.

## Preview locally

Set `GITHUB_TOKEN` securely in your shell. Discovery needs authenticated public GitHub reads. The command defaults to a dry run:

```sh
npm run discover
```

Review `artifacts/discovery-report.json` for proposed entries, held reasons, and source evidence. It is ignored by Git. To apply the results locally:

```sh
npm run discover -- --apply
npm run refresh
npm run build:design-system
npm run check
npm test
npm run check:design-system
npm run build
npm run check:links
```

Only the GitHub workflow commits and publishes; the local command never pushes. GitHub manual runs accept `dry_run=true` and upload a report artifact retained for 30 days.

## Activate

Merge the discovery workflow into main before enabling the Cloudflare schedule.

1. Configure production deployment as described in [RELEASING.md](RELEASING.md#automatic-deployment-from-main): repository secret `CLOUDFLARE_API_TOKEN`, variable `CLOUDFLARE_ACCOUNT_ID`, and variable `CLOUDFLARE_DEPLOY_ENABLED=true`. The publishing job checks these before making changes. The account ID identifies the deployment account and is supplied through the environment instead of source code.
2. Create a **fine-grained GitHub personal access token** restricted to `jackwalkerlabs/useclis`, with repository **Actions: Read and write** permission. No Contents write permission is needed by the scheduler. Use an appropriate expiration date and rotate before it expires. Do not reuse a broad local `gh` login token.
3. From this checkout, export `CLOUDFLARE_ACCOUNT_ID` in your shell and authenticate Wrangler with your own account. Store the dispatch token using the hidden prompt:

   ```sh
   npx wrangler secret put GITHUB_DISPATCH_TOKEN --config workers/discovery/wrangler.jsonc
   ```

4. Test discovery without publishing, then run one publication:

   ```sh
   gh workflow run discover-clis.yml --ref main -F dry_run=true --repo jackwalkerlabs/useclis
   # Inspect the completed run and its report before the first publication.
   gh workflow run discover-clis.yml --ref main --repo jackwalkerlabs/useclis
   ```

5. Deploy the scheduler:

   ```sh
   npm run deploy:discovery
   ```

Cloudflare cron changes may take up to 15 minutes to propagate. Verify a scheduled invocation in Workers logs, its corresponding GitHub discovery run, the following production CI run, and the live catalog. A successful dispatch alone does not mean publication succeeded. No deployment credentials belong in Worker `vars`, the catalog, source evidence, logs, or chat.

## Pause and recover

- Pause discovery by removing its cron in `workers/discovery/wrangler.jsonc` and redeploying the scheduler. Stop a currently running workflow separately if necessary.
- Set `CLOUDFLARE_DEPLOY_ENABLED=false` to pause all automatic production releases; discovery publication also stops at its preflight check.
- Change a held candidate to `rejected` in `discovery/state.json` to suppress it. To reconsider it, remove its record or reset `checkedAt`.
- To undo a bad addition, revert its catalog/data commit and retain a rejected record so it is not rediscovered. Follow the existing production rollback instructions if immediate rollback is needed.
- Check GitHub's Actions failure notifications and Cloudflare Worker logs. A dispatch error fails the scheduled invocation; credential expiry, missed schedules, or disabled workflows require operator attention.

References: [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/), [workflow dispatch permissions](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event), [npm executable declarations](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#bin), [Python script declarations](https://packaging.python.org/en/latest/specifications/pyproject-toml/#entry-points), [Cargo targets](https://doc.rust-lang.org/cargo/reference/cargo-targets.html), [Homebrew analytics](https://docs.brew.sh/Analytics).
