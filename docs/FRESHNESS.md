# Directory freshness operations

The daily `Refresh directory snapshots` workflow targets 06:17 UTC. GitHub can delay schedules. GitHub metadata/activity and Homebrew check timestamps expire after 36 hours (one daily interval plus 12 hours for scheduling and retries). Homebrew's date-only upstream generation date expires after 72 hours; a successful HTTP check cannot make old upstream analytics fresh.

Each provider keeps its actual successful `checkedAt`. GitHub refresh attempts also record `attemptedAt` and `status` (`ok`, `error`, or activity `pending`). A failed request preserves values and the successful timestamp. Tool pages immediately label failed observations stale; delayed observations become stale after the window. Browser labels recalculate on load and every minute; static/no-JavaScript labels reflect build time and include absolute UTC timestamps. Homebrew already stores separate check/attempt dates. Missing observations are unavailable, never zero.

## Repository identity

The catalog repository remains the join key for source-list provenance, Homebrew/download mappings and activity endpoints. Repository `source` records that requested GitHub URL; `canonicalSource` records the API's current `html_url` and `repositoryId` pins GitHub's numeric repository identity. Validate API full_name/URL consistency and reject a changed stored ID (including reuse of an old name by another repository). Commit and activity collection use the pinned numeric endpoint when available so reuse of the old name cannot mix in another repository’s statistics. Initial migration trusts GitHub's repository endpoint and its redirects. A rename does not rewrite the original source list or silently disconnect mappings. Example: `dbt-labs/dbt-core` resolves to `dbt-labs/dbt`, ID `53548867` (verified September 15, 2026).

## Failure publication and monitoring

The daily job runs every collection step even after a provider fails. It validates the resulting saved/new snapshots before committing and dispatching publication, then reports failed collection and stale/failed/missing provider records as a failed Actions run. Invalid data, failed tests/builds or rejected pushes prevent publication. Activity 202 responses retain their timestamp and pending status; they become an unhealthy observation when overdue.

The independent `Monitor directory freshness` workflow runs every six hours and on manual dispatch. It checks the latest completed daily run, a successful daily run started within 36 hours, and every mapped provider snapshot in main. Failures produce a red Actions check and a per-tool job summary. It needs only Actions/content read permissions, no new credentials or external service. It shares GitHub's scheduling failure domain, so it cannot report a total Actions outage; maintainers must inspect Actions and the visible timestamps. Existing repository notification preferences control any GitHub notifications.

Recovery: inspect the failed daily run and monitor summaries, repair the underlying problem, dispatch `refresh-directory.yml` on main, and verify the generated `ci.yml` deployment run. A green refresh run means collection/validation/push/dispatch succeeded; it does not prove the asynchronous deployment completed. Dispatch `monitor-freshness.yml` after recovery and verify live timestamps separately.

## Concurrency and release verification

Daily refresh and discovery share `directory-snapshots` with cancellation disabled, but GitHub concurrency can replace pending runs. Both must load current main after obtaining the lock. Daily refresh now explicitly checks out main; human changes during collection cause a safe non-fast-forward push rejection. Never force-push or rebase unvalidated snapshots. A CI dispatch using `--ref main` can race with newer main commits; inspect the deployed SHA and dispatch the newest main again if necessary. CI deployment/dispatch hardening belongs to the release coordinator.

No production data is refreshed by this change locally. After merge, the coordinator must run the production refresh, monitor its deployment through completion, and verify at least ten representative pages including OpenCode. Record provider UTC timestamps and visible states; an overdue provider must display stale. The first subsequent scheduled daily run is required to confirm actual cadence rather than only manual recovery.
