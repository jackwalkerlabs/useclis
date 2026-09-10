# Publish the repository and deploy useclis.com

## Before making the repository public

- useclis code and the AI-generated `design-system/` bundle belong to this repository and use MIT; the full license is in `LICENSE`. Preserve the separate [third-party notices](../THIRD_PARTY.md).
- Use `jackwalkerlabs/useclis` with Issues enabled for submissions. For forks without an issue destination, set `PUBLIC_SUBMISSIONS_REPO` to an empty value to offer draft downloads.
- Push only `main` for the intended single-commit initial history; local recovery branches contain earlier snapshots.
- Review files and Git history before the first public push. Credentials, build output, local validation artifacts, and dependencies are ignored. The initial pattern scan found no matching token/private-key/personal-path patterns; that scan is not a guarantee.
- Finish the real-browser desktop/mobile check. Automated component tests and production HTTP checks pass, but Chrome access is currently blocked by the local CUA grant.
- Branding is `useclis` across the app, package, Worker, and design system. Existing Openrepo bookmarks migrate to the new browser storage key.

GitHub's [licensing guide](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository) explains why the public repository needs an explicit open-source license.

## Production deployment

Production is the `useclis` Cloudflare Worker with the `useclis.com` custom domain declared in `wrangler.jsonc`. Cloudflare manages the domain's DNS and certificate. The account ID in that file is an identifier, not a credential.

For a manual deployment with an authenticated Wrangler session:

```sh
npm ci
npm run check
npm test
npm run check:design-system
SITE_URL=https://useclis.com npm run build
npm run check:links
npx wrangler deploy
node scripts/check-http.mjs https://useclis.com
```

`SITE_URL` is a build environment variable. It produces canonical URLs, the robots sitemap reference, and the sitemap. `PUBLIC_SUBMISSIONS_REPO` defaults to `jackwalkerlabs/useclis`.

## Automatic deployment from main

The **Validate site** workflow validates every push and pull request. After successful validation, pushes to `main` and manual runs on `main` deploy the exact build that passed validation, then compare all public files and the custom 404 response with the build. Pull requests and other branches cannot deploy. Superseded main commits are skipped, and active main runs are allowed to finish instead of being cancelled during deployment.

Configure the repository once:

1. Create a Cloudflare API token using the **Edit Cloudflare Workers** template, restricted to the production account and `useclis.com` zone. Follow [Cloudflare's GitHub Actions instructions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/).
2. Store the token as the repository Actions secret `CLOUDFLARE_API_TOKEN`. `gh secret set CLOUDFLARE_API_TOKEN --repo jackwalkerlabs/useclis` prompts securely; do not put the value in source, logs, or chat. Local Wrangler OAuth credentials are not used by GitHub.
3. Enable deployments and test a manual main run:

   ```sh
   gh variable set CLOUDFLARE_DEPLOY_ENABLED --body true --repo jackwalkerlabs/useclis
   gh workflow run ci.yml --ref main --repo jackwalkerlabs/useclis
   ```

Without `CLOUDFLARE_DEPLOY_ENABLED=true`, CI still validates but skips deployment. Set it to `false` to pause automatic releases. Use one deployment system for production; a separate Cloudflare Workers Builds integration is unnecessary.

The daily snapshot workflow commits refreshed data to main, then explicitly dispatches **Validate site**. This is required because [pushes made with `GITHUB_TOKEN` do not trigger another push workflow](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow). It has `actions: write` solely to dispatch that pipeline; the validation/deployment workflow retains `contents: read`. Protected branches may require a PR-based snapshot update flow.

To roll back a release, use `npx wrangler deployments list` and `npx wrangler rollback <version-id>`, then revert the faulty commit on main before the next automatic deployment.

References: [Worker custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

## Launch checks

Verify HTTPS, homepage search/filter/save, a CLI detail page and copy button, mobile navigation, the 404 response, canonical URLs, `/sitemap-index.xml`, `/robots.txt`, and snapshot freshness on useclis.com. Publishing the repository and deploying the domain are separate actions; publishing alone does not deploy the site.
