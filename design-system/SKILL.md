---
name: useclis-design
description: Create or update useclis interfaces and prototypes using its design tokens, React components, and CLI directory patterns.
---

Read [readme.md](readme.md) for identity, voice, and foundations. Use the lowercase `useclis` name and the mark in `assets/icon.svg`.

Use existing tokens and components when extending this app. The production app lives in `../src/`; `ui_kits/web/` contains standalone examples. Source metrics from the checked-in catalog and snapshots; never fabricate historical growth or imply that a source badge certifies a CLI.

After changing component sources, run `npm run build:design-system` from the repository root to refresh the browser bundle, manifest source hashes, and sample catalog data. Preserve the origin and third-party notices when distributing the kit.
