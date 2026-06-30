# Repository Instructions

- Always give extremely concise responses.
- Use `@xgx/ui/icons` for shared UI and demo iconography.
- Do not use letter placeholders or hand-written inline SVG icons when an exported Lucide icon exists.
- Keep the demo Bun-native. Do not add Vite config or static mock previews.

## SolidJS v2 Rules

- Target SolidJS v2 only. Do not add new Solid v1-only APIs or patterns.
- Use `@solidjs/web` for web JSX/runtime imports such as `Dynamic`, `render`, `template`, `insert`, `spread`, and JSX types.
- Use Solid v2 two-phase effects: `createEffect(compute, effect)` and `createRenderEffect(compute, effect)`. Do not use v1 single-callback effects.
- Put reactive reads in the compute function and DOM/side effects in the effect function.
- Use `onSettled` for mount-style work where possible; do not add compatibility `onMount` wrappers.
- Do not destructure reactive props in components. Read `props.foo` or split with the project `splitProps` helper.
- Do not pass accessors as prop values unless the receiving API explicitly expects an accessor. In v2 call accessors at the JSX call site.
- Reads after setters are deferred until flush. Design code around deferred flushes instead of adding compatibility shims.
- For DOM insertion and prop spreading, prefer native `@solidjs/web` `insert`/`spread`; do not hand-roll reactive DOM binding.
- `<Show>` and conditional children must remain reactive; avoid one-shot wrappers for routed or stateful content.
- `createMemo` is for derived values; do not use it for side effects.
- Writes inside owned scopes require explicit intent; do not sprinkle ownership overrides through app code.
- Reimplement any dependency behavior that is not v2-compatible as native SolidJS v2 code. Do not fake missing behavior.
- Do not add compatibility layers or `packages/ui/src/vendor` shims. Shared UI source should read like idiomatic Solid v2.
