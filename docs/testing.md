# UI Test Strategy

CI runs three browser layers against the real Bun demo:

- Functional: Playwright interaction flows for routing, async portals, deferred select data, and schema forms.
- Accessibility: axe scans for core WCAG 2.0/2.1 A/AA violations on representative catalog routes.
- Visual regression: Playwright screenshot baselines for stable, high-value catalog pages.
- ARIA snapshots: Playwright accessibility-tree assertions for core named regions and generated controls.
- Keyboard: Playwright keyboard-only flows for navigation, menus, toggles, and auth segmented controls.

PR CI is intentionally fast: one browser, representative route coverage, and stable snapshots only.
Scheduled/manual audits run deeper Lighthouse and Pa11y checks without blocking normal PR flow.

Commands:

```sh
bun run test
bun run test:functional
bun run test:a11y
bun run test:aria
bun run test:keyboard
bun run test:visual
bun run test:visual:update
bun run test:ci
```

Visual snapshots are reviewed and committed only when an intentional design change is made.
