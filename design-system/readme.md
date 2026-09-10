# useclis design system

The visual language for useclis, a directory of command-line tools for agents.

## Identity

Write the product name as **useclis**, lowercase. The wordmark is `useclis` followed by a green dot. Pair it with the code-bracket mark in [icon.svg](assets/icon.svg). Keep the mark legible at small sizes and give it at least 8px of breathing room.

## Voice and data

Explain what a command does and where its data comes from. Use short, concrete labels: “Find a CLI”, “GitHub stars”, “Saved CLIs”, and “View repository”. Show the command itself in monospace. Write sentence-case headings.

Repository stars and activity are dated observations. Never imply that a listing is certified, fabricate growth, or present unknown values as zero. Link to the source and label chart windows. Bookmarks live in the visitor's browser. Examples demonstrate commands; the site does not execute them.

## Foundations

- White cards on an off-white page, near-black text, and subtle borders.
- Green (`--green-600`, `#17974f`) for the brand accent and positive change; red for negative change; amber for featured labels. Pair status colors with text.
- Geist for prose; Geist Mono with tabular numerals for commands and metrics. The app self-hosts fonts; standalone specimens load Google Fonts.
- A 4px spacing scale, 1152px maximum content width, 16px card padding, and 12px card corners. Compact controls use 6–8px corners.
- Near-black primary buttons, visible keyboard focus, 120ms control transitions, and 180ms surface transitions.
- On phones, keep commands readable, wrap actions, and allow horizontal featured-card scrolling while preserving vertical page scrolling.
- Dark palette aliases are available under `[data-theme="dark"]`; the production app currently uses the light theme.

## Components and previews

`components/core/` provides Button, IconButton, Input, Select, Checkbox, Switch, Card, Badge, Tag, and Avatar. `components/data/` provides ToolCard, LeaderboardRow, SourceBadge, MetricStat, GrowthDelta, and FeedItem. Each component has a React implementation, a type declaration, and a usage note.

[The web kit](ui_kits/web/index.html) is a small interactive CLI directory example with search, categories, and detail views. Its entries come from the checked-in catalog and repository snapshots. It uses CDN-hosted React for standalone previews; the production Astro app bundles its own dependencies.

[Guidelines](guidelines/brand-wordmark.card.html) and the component cards use the same tokens. `_ds_manifest.json` indexes the kit; `_ds_bundle.js` exposes its components as `window.UseclisDesignSystem`. Regenerate the bundle and sample data with `npm run build:design-system` after changing component sources or catalog data.

## Origin and third-party materials

This kit adapts a supplied TrustMRR-inspired reconstruction into useclis branding and CLI examples. The supplied documentation described inferred tokens and components, with no original codebase or brand assets supplied. No license accompanied that bundle. Rebranding does not establish redistribution rights; see [third-party materials](../THIRD_PARTY.md) before publishing. useclis is independent of TrustMRR and the listed projects.
