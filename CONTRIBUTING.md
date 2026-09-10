# Contributing

Use the Node version in `.node-version`, then run `npm ci` and `npm run dev`.
The app builds from checked-in repository snapshots; contributors do not need API keys.

## Add or correct a CLI

Edit `src/data/catalog.json`. Include the canonical GitHub repository, an actual CLI entry point, a concise agent use case, official documentation, capabilities, and a representative example command. Follow an existing entry and use a category from `src/data/tools.ts`.

Run `npm run refresh` to collect metadata, an owner avatar, weekly activity, and an initial star snapshot. An optional `GITHUB_TOKEN` can be provided through your shell environment for API limits. Never include credentials, customer data, or machine-specific paths in examples or pull requests. Do not fabricate historical statistics.

Provide documentation supporting additions or capability changes. Listing a tool does not certify compatibility with every agent. Avoid editing the archived general-software catalog.

## Before opening a pull request

```sh
npm run check
npm test
npm run build
npm run check:links
```

Describe the problem, resulting behavior, and checks run. For UI changes, check desktop and phone layouts, keyboard navigation, and the controls you changed. Component tests do not verify visual layout.

Original useclis code is MIT-licensed. Provenance and redistribution terms for the supplied design bundle are being finalized before the first public release; see [release preparation](docs/RELEASING.md) and [third-party materials](THIRD_PARTY.md).
