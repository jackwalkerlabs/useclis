# Contributing

Use the Node version in `.node-version`, then run `npm ci` and `npm run dev`.
The app builds from checked-in repository snapshots; contributors do not need API keys.

## Add or correct a CLI

Edit `src/data/catalog.json`. Include the canonical GitHub repository, an actual CLI entry point, a concise agent use case, official documentation, capabilities, and a representative example command. Follow an existing entry and use a category from `src/data/tools.ts`.

Run `npm run refresh` to collect metadata, an owner avatar, weekly activity, and an initial star snapshot. Provide `GITHUB_TOKEN` through your shell environment for a full catalog refresh; unauthenticated GitHub limits are too small for the complete run. Never include credentials, customer data, or machine-specific paths in examples or pull requests. Do not fabricate historical statistics.

Provide documentation supporting additions or capability changes. Listing a tool does not certify compatibility with every agent. Avoid editing the archived general-software catalog.

## Before opening a pull request

```sh
npm run check
npm test
npm run build:design-system
npm run check:design-system
npm run build
npm run check:links
```

Describe the problem, resulting behavior, and checks run. For UI changes, check desktop and phone layouts, keyboard navigation, and the controls you changed. Component tests do not verify visual layout.

useclis code and the AI-generated design bundle are part of this repository and MIT-licensed. Preserve third-party font, icon, and asset notices; see [third-party materials](THIRD_PARTY.md).
