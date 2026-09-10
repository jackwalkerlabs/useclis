# Publish the repository and deploy useclis.com

## Before making the repository public

- Choose the app license and add its full text as `LICENSE`. MIT is proposed, awaiting the owner's choice.
- Confirm permission to redistribute the supplied `design-system/` bundle, or replace it with independently authored implementation files. See [third-party materials](../THIRD_PARTY.md).
- Choose the GitHub owner and create the public `useclis` repository. This checkout currently has no remote; the initial commit contains no app files.
- Review files before the first commit. Credentials, build output, local validation artifacts, and dependencies are ignored. The initial pattern scan found no matching token/private-key/personal-path patterns; that scan is not a guarantee.
- Finish the real-browser desktop/mobile check. Automated component tests and production HTTP checks pass, but Chrome access is currently blocked by the local CUA grant.
- Branding is `useclis` across the app, package, Worker, and design system. Existing Openrepo bookmarks migrate to the new browser storage key.

GitHub's [licensing guide](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository) explains why the public repository needs an explicit open-source license.

## Cloudflare Workers build

Connect the public repository in Cloudflare Workers Builds and use:

| Setting | Value |
| --- | --- |
| Worker name | `useclis` |
| Root directory | repository root |
| Node | `22.22.2` (also in `.node-version`) |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Build environment | `SITE_URL=https://useclis.com` |

`SITE_URL` must be a build environment variable, not just a runtime Worker variable. It produces the canonical URLs, robots sitemap reference, and sitemap. To verify locally, run `SITE_URL=https://useclis.com npm run build`, then `npm run check:links` and `npx wrangler deploy --dry-run`.

Build and browse a preview first. Once the domain is an active Cloudflare zone in the same account and the preview is approved, add `useclis.com` under the Worker's Settings → Domains & Routes → Custom Domain. Cloudflare provisions the associated DNS record and certificate. Check existing DNS records before making that change. Domain ownership, zone/account access, and current DNS have not been verified by this local preparation.

References: [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [Worker custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

## Updates after launch

The daily GitHub workflow refreshes checked-in snapshots and commits them with the repository token. Enable Actions and permit the intended snapshot update workflow on the default branch. Protected branches may require a PR-based approach. Confirm in Cloudflare that a bot-generated snapshot commit actually produces a deployment; do not assume the two services are connected until tested.

The validation workflow runs on pushes and pull requests without deployment credentials. Do not add API credentials to public files or client code.

## Launch checks

Verify HTTPS, homepage search/filter/save, a CLI detail page and copy button, mobile navigation, the 404 response, canonical URLs, `/sitemap-index.xml`, `/robots.txt`, and snapshot freshness on useclis.com. Publishing the repository and deploying the domain are separate actions; neither has happened yet.
