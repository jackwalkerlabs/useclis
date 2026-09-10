# useclis mobile black-box audit — 2026-09-09

Original CUA Driver screenshots from the existing Chrome process. The app frame contains unmodified HTTP response bodies fetched live from https://useclis.com, forwarded through a localhost proxy because the Mac resolver returned ERR_NAME_NOT_RESOLVED. No application source was inspected or changed. The surrounding frame and controls are the responsive test harness, not site UI.

Viewport sizes: 320 × 568 and 390 × 844 CSS pixels; desktop comparison at 1024 × 844. These are responsive-layout checks in desktop Chrome, not physical-device, touch, keyboard, or Safari validation.

The proxy retained the production body bytes and content types. It did not forward the production frame restriction, allowing the local test harness to embed the page. The frame constraint does not change the app's viewport media queries. Screenshots are unedited.
