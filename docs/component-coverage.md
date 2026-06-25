# Component Coverage

| Area | Demo Coverage | Status | Missing/Next |
| --- | --- | --- | --- |
| Tokens | Light/dark themes, independent control tokens, status tokens, shell tokens | Live | Add visual regression snapshots |
| Shell | `AppShell`, `AppTopbar`, `AppPageHeader`, `CommandRegion`, `DetailPanel`, `Sidebar` | Live | Add responsive screenshots |
| Toolbar controls | `IconButton`, `ToolbarSurface`, `ToolbarIconButton`, `ToolbarToggleGroup`, `ToolbarToggleItem` | Live | Add keyboard tests |
| Navigation | Sidebar active/inactive/circle states and section navigation | Live | Add router-link example |
| Forms | Text field, validation, textarea, number field, slider, radio, checkbox, switch | Live | Add select/combobox validation flows |
| Data | Filtered `DataGrid`, saved views, empty state, bulk actions | Live | Add virtual/infinite table workflow |
| Workflows | List-to-detail, approval/review flow, task queue, progress | Live | Add editable CRUD mutation flow |
| Overlays | Dialog, dropdown menu, toast region | Live | Add sheet/popover examples |
| Feedback | Badges, callouts, error, skeleton, empty, progress, toast | Live | Add query boundary states |
| Advanced | Calendar, document preview, rich text editor, file dropzone, detail sidebar | Live | Add drag reorder and document toolbar examples |

## Catalog Rules

- Every visible interactive example should use exported `@xgx/ui` primitives or `@xgx/prefabs` workflows.
- Demo-only layout glue may use plain `div` and semantic HTML, but should not reimplement existing shared components.
- Code examples must show package-root imports unless documenting a subpath export.
- Catalog copy stays generic and product-neutral.

## Static Checks

Run these before release:

```sh
rg "vite|@tailwindcss/vite|vite-plugin-solid|apps/demo/static" package.json apps packages
rg "<svg|</svg" apps/demo/src packages/ui/src/shell-controls.tsx packages/ui/src/layout/app-shell.tsx
rg "bg-[a-z-]+-foreground.*text-foreground|bg-\\w+-foreground\\s+text-foreground" packages apps
rg "file://" .
```

Legacy specialized components may still need token/icon cleanup when they are promoted into the canonical catalog. New shell-control and catalog code must stay clean.
