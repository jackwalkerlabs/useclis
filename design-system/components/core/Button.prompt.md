One-line: the standard useclis action control — use `primary` (near-black) for page CTAs, `brand` (green) only for accent actions, `secondary` for everything alongside them.

```jsx
<Button variant="primary" size="lg" iconLeft={<PlusIcon/>}>Find a CLI</Button>
<Button variant="secondary">Explore the directory</Button>
```

Variants: primary · brand · secondary · ghost · danger. Sizes sm/md/lg (32/38/46px). `loading` swaps the left icon for a spinner and disables. Hover darkens, press scales to 0.98.
