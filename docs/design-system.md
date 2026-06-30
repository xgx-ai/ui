# Design System

## Principles

- Build operational application UI first: dense, scan-friendly, predictable, and keyboard-accessible.
- Keep shared components app-agnostic. No product names, logos, app palettes, or app-specific copy belong in `packages/ui/src`.
- Apps provide raw CSS variable values. `@xgx/ui` owns semantic token names, state styling, and foreground/background pairing.
- Prefer existing primitives before adding new abstractions. Add a primitive only when a real workflow needs it.

## Package Boundaries

- `@xgx/ui` contains query-free primitives, tokens, forms, overlays, layout, and shared types.
- `@xgx/query` contains Solid v2 suspending async/query primitives. See [Query](./query.md).
- `@xgx/prefabs` contains composed workflows that may depend on both `@xgx/ui` and `@xgx/query`.
- The demo may import all three packages; `@xgx/ui` must not import query or prefabs.

## Token Contract

Apps may define raw values such as `--primary`, `--background`, `--control`, and `--sidebar`. Shared components consume semantic Tailwind tokens from `packages/ui/src/base.css`.

Required pairing rules:

- `bg-primary` with `text-primary-foreground`
- `bg-secondary` with `text-secondary-foreground`
- `bg-surface` with `text-surface-foreground`
- `bg-surface-raised` with `text-surface-raised-foreground`
- `bg-control` with `text-control-foreground`
- `bg-control-hover` with `text-control-hover-foreground`
- `bg-control-active` with `text-control-active-foreground`
- `bg-sidebar-primary` with `text-sidebar-primary-foreground`
- `bg-sidebar-accent` with `text-sidebar-accent-foreground`
- `bg-success`, `bg-warning`, `bg-error`, and `bg-info` with their matching foreground tokens

Control tokens are independent from brand tokens:

```css
--control: var(--surface-raised);
--control-foreground: var(--surface-raised-foreground);
--control-hover: var(--hover);
--control-hover-foreground: var(--hover-foreground);
--control-active: var(--primary);
--control-active-foreground: var(--primary-foreground);
--control-border: var(--border-subtle);
```

## Icons

- Use `@xgx/ui/icons` for shared UI and demo iconography.
- Do not use text placeholders inside icon buttons.
- Do not hand-write inline SVG when an exported Lucide icon exists.
- Icon-only controls must have an accessible name through `aria-label` or equivalent text.

## Layout And Density

- Operational screens should use app shell, topbar, sidebar, page header, command/search region, toolbar, content region, and detail panel primitives.
- Toolbars use circular icon buttons inside pill surfaces. Rounded-square icon buttons inside fully rounded toolbar surfaces are not supported.
- Use compact but stable dimensions for controls, tables, sidebars, and toolbar items.
- Avoid card nesting. Cards frame repeated items, panels, and tools only.

## Accessibility

- Interactive components must expose disabled, selected/pressed, hover, and focus-visible states.
- Focus rings use `ring`/`focus` tokens, not hardcoded colors.
- Use semantic controls where possible: button, input, dialog, menu, tab, radio, checkbox, and slider primitives.
- Preserve keyboard behavior from native and vendored primitives when composing higher-level components.

## Demo Runtime

- The canonical demo is Bun-native and component-real.
- Run with `bun run demo`.
- Build with `bun run demo:build`.
- Do not add Vite config or static mock previews.
