# SolidJS 2 beta: known issues and workarounds

A register of SolidJS 2 beta behaviour we have hit in `@xgx/ui`, `@xgx/query`,
`@xgx/prefabs` and `@xgx/solid`, and what we did about it.

Pinned version: **`solid-js` / `@solidjs/web` / `@solidjs/signals` / `babel-preset-solid`
2.0.0-rc.0**.

### beta.31 → rc.0

Upgraded 14 August 2026. Every typecheck, unit suite, probe, demo build and static test
passes. **The RC introduced no regression of its own**: the browser suite went from 36
passed / 23 failed to 51 passed / 8 failed, and the entire improvement came from fixing
defects that were already present on beta.31.

That distinction is the main result of this walk, and it was only visible because the
browser suite was given a **beta.31 baseline before the pin moved**. Without that baseline
the flow failures below read as an RC regression; they are not. Take the baseline first.

| | How it was re-checked | Result |
| --- | --- | --- |
| **S1** | Needs the real application — see the procedure in the entry | Not re-checked in this repo; carried forward |
| **S2** | `beta-probes/halts-s2.test.ts` | Still halts the graph with `[REACTIVITY_HALTED]` |
| **S3** | `packages/query/test/fetch-storm.test.ts` | Still no reproduction |
| **S5** | Deferral is unchanged; `latest` still required | Carried forward |
| **S6** | Full Playwright suite, including the async-portal `DialogClose` guard | Remains fixed |
| **S7** | `beta-probes/register.test.ts` | Still treats an `undefined` default as missing |
| **S10** | `query.test.ts` "mutation pending includes awaited query invalidation" | Still `fetching() === false`, `pending() === true` |
| **S11** | `beta-probes/register.test.ts` | The real `<Show>` accessor still throws after its condition goes falsy |
| **S8** | `lucide-solid@0.563.0` npm metadata | Still peers `solid-js: ^1.4.7` |

No registered workaround became clearable. Two new entries were added — **S12** and **S13**
— both found by baselining the browser suite, and both pre-dating the RC.

**Three browser failures remain, none of them Solid's.** Six `visual.spec.ts` snapshots
compare darwin baselines against a linux renderer and cannot pass off a Mac.
`dnd.spec.ts`'s `dragItem` helper measures the drop target *before* `mouse.down()`, but
lifting a row reflows the list upward, so the precomputed y can land past the target's
midpoint — it is sensitive to row height and therefore to platform. And `flow.spec.ts`'s
"refuses to connect a node to itself" now fails **honestly**: it had only ever passed
because no connection could be completed at all (S13). Upstream xyflow permits self-loops
in strict mode and this port adds no guard, so the assertion describes behaviour nobody has
implemented. It needs a product decision, not a fix.

### beta.29 → beta.31

Upgraded 5 August 2026, together with `vite-plugin-solid` 3.0.0-next.21 → next.22
in Onshyft. Every suite, typecheck, lint and Playwright test passes. No registered
workaround became clearable.

The only upstream client-reactivity change was `@solidjs/signals`' fix for an ambient
same-tick write being missed by render effects under an `isPending` lane (#2963). The
remaining changes are principally SSR, hydration and server-component repairs. The signal
fix was plausible for **S1**, but the real application still produced its exact signature:
the clients heading, chips and footer changed to 1 while the table retained 30 unfiltered
rows. Restoring `query.retained()` returned the table to one row.

| | How it was re-checked | Result |
| --- | --- | --- |
| **S1** | The application procedure below, on the clients table | Still present: summary 1, footer 1, rows 30 without `retained`; rows 1 after restoring it |
| **S2** | `beta-probes/halts-s2.test.ts` | Still halts the graph with `[REACTIVITY_HALTED]` |
| **S3** | `packages/query/test/fetch-storm.test.ts` | Still no reproduction across the guarded pending, settled, failed and many-reader paths |
| **S5** | The browser probe in `packages/query/test/retention-probe` | Still `filter=a`, `latest=b`, pending, rows `a-*`; settles to `b` |
| **S6** | Full Playwright suite, including the async-portal `DialogClose` guard | Remains fixed; context crosses the portal |
| **S7** | `beta-probes/register.test.ts` | Still treats an `undefined` default as missing |
| **S10** | `query.test.ts` "mutation pending includes awaited query invalidation" | Still `fetching() === false`, `pending() === true` |
| **S11** | `beta-probes/register.test.ts` | The real `<Show>` accessor still throws after its condition goes falsy |
| **S8** | Current `lucide-solid@1.28.0` npm metadata | Still peers `solid-js: ^1.4.7` |

The Marker-shaped cleanup probe still does not trip the owned-scope write rule, so
Onshyft's **A2** remains unproven rather than confirmed. The map surface was not rewritten
to force the old Marker implementation.

### beta.26 → beta.29

Upgraded 31 July 2026, to satisfy `vite-plugin-solid@3.0.0-next`'s peer range. Every suite,
typecheck and lint passes unchanged. The register was walked entry by entry.

Most of the walk is now automated: **`bun run beta:probes`** (also part of `bun run test`)
runs [`packages/solid/beta-probes`](../packages/solid/beta-probes) against the *development*
build. Those tests pin the behaviour each entry describes, so a failure there is the signal
that an entry may be clearable — read the entry before "fixing" the test.

**Fixed: S6** — ancestor context now survives the manual portal insertion, and **the
re-provide has been deleted** from both portal paths in `dialog.tsx`. Guarded by the demo's
async-portal dialog, whose footer is now a `DialogClose` (it calls `useDialog()`, so it only
renders if context crossed the portal) and by
[`tests/functional.spec.ts`](../tests/functional.spec.ts). Not bisected — it may have landed
before beta.29.

**Still present**, each re-checked rather than assumed:

| | How it was re-checked | Result |
| --- | --- | --- |
| **S1** | The application procedure below, on the clients table | Chip and footer went to 1, rows stayed at 30 unfiltered — the exact documented signature |
| **S2** | `beta-probes/halts-s2.test.ts` | `[REACTIVITY_HALTED]`; the unrelated effect never ran again |
| **S5** | The browser probe in `packages/query/test/retention-probe` | Mid-transition `filter=a`, `latest=b`, rows still `a-*` |
| **S7** | `beta-probes/register.test.ts` | Throws "Context must either be created with a default value…" |
| **S10** | `query.test.ts` "mutation pending includes awaited query invalidation" | Still passes with `fetching() === false`, `pending() === true` |
| **S11** | `beta-probes/register.test.ts`, now driving the real `<Show>` rather than a mirror of it | Accessor still throws once the condition goes falsy |
| **S8** | `lucide-solid@1.28.0` (published 30 July 2026) still peers `solid-js: ^1.4.7` | Third party, unchanged |

**Not re-checked.** S3 has had no reproduction since beta.15 and `fetch-storm.test.ts`
passes. S4 is test infrastructure, not version-dependent. S9 no longer applies to Onshyft,
which moved to Vite and the first-party refresh transform.

**Two traps this walk fell into, both now written into the probes.**

1. `--conditions=browser` on its own selects the **production** build, where every
   diagnostic message is stripped and the owned-scope write rule does not fire at all. A
   probe expecting `[REACTIVE_WRITE_IN_OWNED_SCOPE]` passed silently against it. The probes
   add `--conditions=development`; the other suites do not, and cannot see those diagnostics.
2. A headless harness is not a substitute for the browser probes. A `bun test` version of S5
   reports the **opposite** result — `filter()` reads the new value immediately, and only the
   effect observing the pending memo waits. S5's deferral needs reads inside a rendered tree.
   The same caution the S1 entry already carries applies to S5.

**Correction to an earlier reading of A2** (Onshyft register). A probe reported
`[REACTIVE_WRITE_IN_OWNED_SCOPE]` for the Marker-shaped cleanup, and it was recorded as
"still present". The throw actually came from the probe's own write inside the `createRoot`
callback. Isolated, the Marker shape — apply stores the instance, teardown clears it — does
**not** trip the rule on beta.29, on re-run or on disposal. See
`beta-probes/owned-scope-write.test.ts`, which now pins both halves.

### beta.25 → beta.26

Upgraded July 2026. Both repositories' suites, typechecks and lints pass unchanged.

**Fixed upstream:** [solidjs/solid#2934](https://github.com/solidjs/solid/issues/2934) — an
autodispose leak where a lazy memo that lost its last subscriber while *derivatively*
pending was never released, staying linked to its sources and recomputing forever with zero
subscribers. beta.26 adds `releaseSettledDependents`, whose shipped source comment names the
issue. This is adjacent to **S3**; no application change was needed.

**Still present:** **S5** — confirmed again on beta.26, and it is nastier than first
recorded (see the entry).

**Still present:** **S1** — re-tested against the running application on beta.26 by pointing
the table hooks back at `data()`. Identical failure signature to beta.25: rows stuck at 30,
count chip correctly showing 1. `retained` remains load-bearing.

Onshyft keeps a matching register at `onshyft/docs/solid-2-beta-issues.md` for
application-level workarounds. Framework entries here are the canonical copy.

## How to use this file

- Every workaround in the code carries a comment at the site; this file is the index.
- When the Solid pin moves, walk the **Re-check** column. Several entries have a runnable
  probe, so re-checking is cheap.
- Add an entry when you work around beta behaviour. Record the symptom, not just the fix —
  the symptom is what the next person will search for.
- Distinguish **bug** (should be fixed upstream) from **sharp edge** (working as designed,
  but surprising enough to cost someone a day).

---

## S1 — A keyed `<For>` under `<Loading>` keeps stale children after its source resolves

**Bug.** Confirmed in a browser against the real application on **beta.25, beta.26, beta.29
and beta.31**.

**Symptom.** A list whose source became not-ready beneath `<Loading>` renders its old
children forever. The new value *does* arrive and *does* commit — sibling reads of the same
query update correctly — but the rendered list never changes. In the clients table this
presented as: type a filter, the request fires and returns one row, the count chips update
to the filtered totals, and the table keeps showing all thirty unfiltered rows.

This is worse than a blank flash, because the screen looks plausible and correct.

**Why it is easy to miss.** `<Loading>` retention is *supposed* to keep already-rendered
content visible across a revalidation, and it does. An isolated probe of a plain async memo
under `<Loading>` shows correct behaviour — retention holds, `isPending` flips, the new
value lands. The failure needs a keyed list over a suspending source, which is exactly the
shape a data table has and exactly the shape a minimal reproduction does not.

**Workaround.** Do not let a keyed list read a suspending source once anything has loaded.
`@xgx/query` exposes `retained` on the infinite query result: the last value that query
instance resolved for **any** key, without suspending. The table hooks read it for rows.

- [`packages/query/src/index.tsx`](../packages/query/src/index.tsx) — `retained` on `InfiniteQueryResult`
- [`packages/prefabs/src/data-display/use-table.ts`](../packages/prefabs/src/data-display/use-table.ts)
- [`packages/prefabs/src/table-infinite/use-table-infinite.ts`](../packages/prefabs/src/table-infinite/use-table-infinite.ts)
- [`packages/prefabs/src/forms/use-search-infinite.ts`](../packages/prefabs/src/forms/use-search-infinite.ts)
- [`packages/ui/src/table-compat.tsx`](../packages/ui/src/table-compat.tsx)

A keyed remount also works where a table is already scoped to an identity — Onshyft uses
`<Show keyed>` around the document-library table for the same root cause.

**Re-check — use the application, not the probe.** The standalone probe at
[`packages/query/test/retention-probe`](../packages/query/test/retention-probe/README.md)
renders the same query through both reads (`table.html`) and **does not reproduce the bug on
any version tried** — both lists update. Whatever the failing ingredient is, it lives in the
real table stack (TanStack row contexts, the prefabs pages store, keyed row ids), not in a
keyed `<For>` over a suspending source alone. Do not clear this entry on the strength of the
probe.

The valid procedure, used on beta.26, beta.29 and beta.31:

1. In `use-table.ts` and `use-table-infinite.ts`, make `data` read `query.data()` directly
   instead of preferring `query.retained()`.
2. Filter the clients table and watch two things: the **rows** and the **count chip**. (Since
   Onshyft moved to Vite the edit hot-updates; no dev-server restart is needed.)

The signature of the bug is the chip updating to the filtered total while the rows stay on
the unfiltered list. When both move together, `retained` and every reference above can be
deleted.

---

## S2 — Throwing from an effect's apply phase halts the entire reactive graph

**Sharp edge.** Working as designed; the blast radius is the problem.

**Symptom.** `[REACTIVITY_HALTED] An uncaught error halted the reactive system. No further
updates will be processed.` The whole application stops responding, not just the subtree
that threw. Without an `<Errored>` boundary the throw is swallowed entirely instead.

**Consequence.** An effect is a bad place to raise a developer-facing assertion: it either
disappears or it takes the app down. `@xgx/solid`'s stale-snapshot check therefore
*reports* through a replaceable reporter and never throws; test setup escalates a report to
a failure via `onStaleInitialProp`.

- [`packages/solid/src/initial-prop.ts`](../packages/solid/src/initial-prop.ts)
- [`packages/solid/test/initial-prop.test.ts`](../packages/solid/test/initial-prop.test.ts) — asserts the graph keeps running after a report

---

## S3 — An async memo that *starts* a fetch can drive a self-sustaining refetch loop

**Bug.** Observed on beta.15. Not reproducible on beta.25, beta.26 or beta.31 from
application code, but the mechanism has not been shown to be gone. beta.26 fixed a closely related autodispose
leak ([#2934](https://github.com/solidjs/solid/issues/2934)) in which a derivatively-pending
lazy memo recomputed forever after losing its last subscriber.

**Symptom.** One network request per frame for the same query.

**Mechanism.** A memo returning a promise becomes an async computation: the compute throws
`NotReadyError` and the node re-enters the pending queue. Once the promise settles, any
clock advance re-runs the compute. If the compute *creates* the request rather than
observing an existing one, each re-run fires a new request, and the request's own signal
writes advance the clock again.

**History.** `createInfiniteQuery` called `loadInitialPage` inside `createMemo`; opening a
`SearchInfinite` dropdown fired `complianceRequirements.list` every frame. Fixed July 2026
by driving the fetch from a two-phase effect.

**Current state.** `createQueryResult` still calls `readQuery` — which can start a request —
from inside the `data` memo. Every scenario we could construct is stable, because the
**cache entry owns the promise**: recomputes observe the same promise identity instead of
creating a new one. This was investigated in Phase 3 of the query contract plan and
deliberately left alone rather than refactored without a reproducible defect.

**Rule for new code.** Never start a fetch or other side effect inside `createMemo`. Drive
it from `createEffect(compute, apply)` and let the memo observe a promise something else
holds.

**Re-check.** [`packages/query/test/fetch-storm.test.ts`](../packages/query/test/fetch-storm.test.ts)
pins the pending, settled, failed, idle-at-default-`staleTime` and many-readers paths.

---

## S4 — Effects do not pump headlessly; tests can pass vacuously

**Sharp edge.** Test-infrastructure trap, not a runtime bug.

**Symptom.** Under `bun test` without a web renderer, `createEffect`'s compute runs once at
creation and the **apply phase never runs at all**. Later signal writes do not even re-run
the compute. A test that asserts on effect side effects therefore passes by never
exercising them.

**Workaround.** Run Solid tests with `--conditions=browser`, which selects the client build.
Both suites do:

```bash
bun test --conditions=browser packages/solid/test
bun test --conditions=browser --preload ./packages/query/test/preload.ts packages/query/test
```

This bit during Phase 2: the initial-prop identity check appeared to do nothing until the
condition was added, at which point it worked and the tests became meaningful.

**Caveat.** Even with the flag, headless propagation is not identical to a browser. Anything
touching rendering, boundaries or keyed lists needs a browser check — see S1, which passed
every headless test while being badly broken in the app.

---

## S5 — A transition defers the whole update, not just the boundary

**Sharp edge.** Working as designed; surprising in practice.

**Symptom.** While an async read is in flight after a key change, reads of the key signal
return the **old** value everywhere — including outside the `<Loading>` boundary. A search
input bound to that signal appears frozen until the request lands.

**The consequence is worse than a frozen-looking input.** If a query key is built from a
plain signal, the key computed during the transition uses the **old** value — so the query
re-asks the *previous* question and the new one is never requested. The probe showed this
directly on beta.26: changing the filter produced a second fetch for `a`, not `b`, and the
list never changed. Onshyft is not affected because its table filters travel through the
router, but any query keyed off a bare signal is.

**Workaround.** Read `latest(keySignal)` wherever the in-flight value is what you mean —
both for controls that must stay responsive and for query keys that must follow the change.
Results read normally and lag behind. This is the job Solid's `latest` is actually for.

**A second bite, worse than a frozen input.** The deferral also swallows the *write that
started the update*. Selecting a form-builder field mounted an inspector that read a
suspending accessor; the whole update went pending, so `selected()` kept reading its old
value everywhere — no selection ring, no inspector, and the click looked like a dead no-op
with nothing in the console. Anything a click mounts must therefore avoid suspending on data
the click does not need. Read `cached()` there, not `data()`.

**Evidence.** [`packages/query/test/retention-probe`](../packages/query/test/retention-probe/README.md)
records the full state table: during the transition `filter()` reads `a` while
`latest(filter)` reads `b`.

---

## S6 — Ancestor context is not preserved through manual portal insertion — FIXED

**Bug, fixed as of beta.29; workaround removed.** Portalled dialog parts used to lose
ancestor context, so `DialogContent` re-provided the value inside the portal. Context now
crosses the portal and both portal paths (the plain `div` and the `as` variant) render
`contentChildren()` directly.

**What guards it.** Nothing in the app consumed the dialog context inside the portal, which
is why the workaround could have been deleted silently and broken later. The demo's
async-portal dialog now closes with a `DialogClose` — the one dialog part that calls
`useDialog()` — and [`tests/functional.spec.ts`](../tests/functional.spec.ts) opens it and
clicks it. If context stops crossing the portal, that part throws "Dialog parts must be used
inside Dialog." while rendering and the test fails.

- [`packages/ui/src/overlays/dialog.tsx`](../packages/ui/src/overlays/dialog.tsx)

---

## S7 — An `undefined` context default is treated as missing

**Sharp edge.** `createContext<T>(undefined)` is indistinguishable from a context with no
default, so a legitimately-`undefined` default cannot be expressed. Use an explicit
sentinel.

- [`packages/ui/src/overlays/dialog.tsx`](../packages/ui/src/overlays/dialog.tsx)

---

## S8 — `lucide-solid` ships Solid 1 output

**Third-party, not Solid.** `lucide-solid@1.28.0` still peers `solid-js: ^1.4.7`, so the
package remains Solid 1 output and the Bun plugin applies a transform. Remove once the
package publishes Solid 2 output.

- [`packages/ui/src/bun-plugins/solid.ts`](../packages/ui/src/bun-plugins/solid.ts)

---

## S9 — Hot updates mount a second app and then stop applying

**Ours, not Solid.** Two faults in this repo's Solid HMR layer, found from the Onshyft app and
reproduced standalone on Bun 1.3.11. The dev server is not at fault: it rebuilds on every
change and serves a bundle that matches the source.

**Symptom.** After an edit the page renders a subtree twice; or it shows the *previous* edit
and ignores every later one; or it drops into the error boundary with `Context must either be
created with a default value…` alongside `You appear to have multiple instances of Solid`.
A page reload always recovers.

**What was wrong.**

1. Bun re-evaluates most of the graph for a single leaf edit — including the entry module.
   The plugin gave the entry a bare `import.meta.hot.accept()`, so its module-scope
   `render(...)` ran again and mounted a **second copy of the application**. Two live trees is
   what "old and new modules mixed" actually looked like. Root renders now go through
   `$$root`/`$$disposeRoot`, so the previous root is torn down first.
2. `$$component` created a new record and proxy on every evaluation, and `patchRegistry`
   chained them by storing one record's *proxy* as another's component. The mounted tree
   drifted onto a proxy from an older generation that later patches never reached, and a
   second patch round left a record rendering a proxy of itself. There is now exactly one
   record per component id (`liveRecords`), re-evaluations queue a `pendingUpdates` entry, and
   `$$refresh` applies them in one bracketed pass.

**Re-check.** Two component modules, one rendering the other under a provider. Edit the leaf
twice, then edit provider and leaf together, then the leaf again. The DOM must hold exactly
one copy of the leaf and show the newest text of both. Before the fix the leaf duplicated on
the first edit and froze after the combined one.

**Still open.** Swapping a component that receives `children` cannot be patched in place — the
children were built by its parent and stay bound to the owner the swap disposed, so they
render once more and then never update. The runtime detects this (`rendersChildren`) and
returns false so the module calls `import.meta.hot.invalidate()`, but Bun's reload can still
land the page on a discarded bundle generation, leaving it stale with no live HMR socket.

**Restart required.** The dev server does not watch these two files — they are reached through
a plugin-generated relative path — so a consuming app must restart its frontend process to
pick up a change to either.

- [`packages/ui/src/bun-plugins/solid.ts`](../packages/ui/src/bun-plugins/solid.ts)
- [`packages/ui/src/bun-plugins/solid-refresh-runtime.ts`](../packages/ui/src/bun-plugins/solid-refresh-runtime.ts)

---

## S10 — Signal writes inside an `action` are invisible until the action settles

**Sharp edge.** A `createSignal` write made while an `action` generator is suspended lands in
that action's transition. Readers outside the action keep seeing the previous value for the
whole duration, then jump to the new one when the action resolves.

**Symptom.** A mutation triggers a refetch; the refetch really is in flight (the cache entry
holds a promise), but the query's `fetching()` flag reads `false` for every outside reader.
Any spinner bound to it stays hidden for exactly the window it exists to cover.

**Probe.**

```ts
const [flag, setFlag] = createSignal(false);
const gate = Promise.withResolvers<void>();
const run = action(function* () {
  setFlag(true);
  yield gate.promise;
});
const promise = run();
await Promise.resolve();
flush();
flag(); // false — the write is held in the action's transition
gate.resolve();
await promise;
flag(); // true
```

**Why it matters here.** `createMutation`'s `mutateAsync` is an `action`, and the invalidation
sweep it awaits calls `entry.setFetching(true)`. `ownedWrite: true` does not exempt the write:
owned-write governs *who may write*, not transition visibility.

**What we do.** Nothing — this is the transition contract working as designed, and defeating
it would make the value tear against the rest of the update. `pending()` is the
transition-aware signal and reports `true` correctly throughout, so that is what a spinner
reads during a mutation. `fetching()` remains correct for observer-driven and directly
invalidated refetches, which are not inside an action.

**Re-check.** `packages/query/test/query.test.ts`, "mutation pending includes awaited query
invalidation" asserts `pending() === true` and `fetching() === false` together. If a pin bump
makes `fetching()` true there, the assertion fails and this entry can be narrowed.

---

## S11 — A `<Show>` accessor read after its condition goes falsy throws and takes the tree down

**Sharp edge.** The accessor Solid hands a `<Show>` child is guarded: reading it once the
condition is falsy throws `Attempting to access a stale value from <Show>`. That is fine when
the only thing driving the child's reads is the condition itself. It is a trap when a child's
read *also* depends on something async, because a late settle can re-run that read after the
condition has already flipped.

**Symptom.** A panel inside `<Show>` renders fine, then a seemingly unrelated interaction
takes the whole subtree into its error boundary with the stale-value message. It looks
intermittent because it depends on when a request lands.

**Where it bit.** The form builder's document-acknowledgement panel:

```tsx
<Show when={hasStoredDocument() ? props.document : undefined}>
  {(document) => (
    // Also depends on the documents query, so a settle re-runs it.
    <p>{documentSummaryLabel(document(), selectedSourceDocument())}</p>
  )}
</Show>
```

Selecting a field whose document is not configured flips the condition falsy. A query settle
landing just after that re-ran the label, which read the dead accessor and threw.

**The fix.** Derive the value into a memo and read the memo, not the accessor:

```tsx
const storedDocument = createMemo(() =>
  hasStoredDocument() ? props.document : undefined,
);

<Show when={storedDocument()} fallback={...}>
  <p>{storedDocumentLabel()}</p>   {/* reads storedDocument(), returns "" when undefined */}
</Show>
```

A memo returns `undefined` where the accessor throws, so the late read renders nothing and the
`<Show>` swaps to its fallback on the next flush.

**Rule of thumb.** Use the `<Show>` accessor only for reads the condition alone drives. If a
child's read can be triggered by a query, a timer or any other outside source, read a memo.

**Re-check.** `ui/packages/query/test/show-stale-accessor.test.ts` pins both halves — that the
raw accessor throws, and that the memo form does not.

---

## S12 — An identity-keyed list over objects a library replaces remounts at the frame rate

**Ours, not Solid.** Found on rc.0, confirmed present on beta.31.

> The `flow` module these examples came from has since been deleted — it wrapped
> `@xyflow/system`, no app ever imported it, and the workspace canvas replaced it. The
> lesson stands for any list fed objects that a library replaces underneath us.

**Symptom.** Nothing looks wrong. The flow canvas renders correctly, nodes are measured,
positions are right, and a screenshot is perfect. But no pointer interaction works —
clicking a node does not select it, nodes cannot be dragged, handles cannot be connected —
and Playwright reports `has no bounding box` for an element that is plainly visible in the
page snapshot it attaches.

**Mechanism.** `<For>` is keyed by item identity by default. `NodeRenderer` fed it
`InternalNode` objects out of the store, and `adoptUserNodes` *replaces* those objects when
it measures. So every measurement remounted every wrapper, and each fresh wrapper's render
effect scheduled another measurement through `requestAnimationFrame` — a loop running at
the frame rate for as long as the canvas is mounted. A `MutationObserver` on the node
container counted **385 add/removes in 1.5 seconds** across five nodes, which is one full
remount per animation frame.

Interaction is impossible under that loop for two compounding reasons: the DOM node under
the pointer is destroyed between `mousedown` and `mousemove`, and every listener attached to
it dies with it. `boundingBox()` returns null because Playwright resolves the element in one
protocol round-trip and measures it in the next, by which time it has been replaced.

**Why it hid for so long.** Every static assertion passes — mount, count, measurement,
viewport, screenshots. Only pointer-driven tests fail, and they fail with geometry errors
that read as flakiness or as a headless-browser quirk rather than as a reactivity fault.

**The fix.** Key by something stable:

```tsx
<For each={nodeEntries()} keyed={(node) => node.id}>
  {(node) => <NodeWrapper node={node()} … />}   {/* custom key ⇒ item is an accessor */}
</For>
```

**Rule for new code.** If a list's items are objects owned and recycled by a library —
anything that measures, adopts, normalises or reconciles them — do not let `<For>` key on
their identity. Key on the domain id.

- [`packages/ui/src/flow/container/NodeRenderer/NodeRenderer.tsx`](../packages/ui/src/flow/container/NodeRenderer/NodeRenderer.tsx)

**Re-check.** `tests/flow.spec.ts`, the `selection` and `dragging nodes` groups. For the
loop itself, observe the node container's mutations for a second and assert zero.

---

## S13 — An imperative library that reads its own write back in the same event sees the old value

**Sharp edge.** Working as designed, and the single most expensive Solid 2 behaviour to
port onto third-party imperative code. Confirmed on beta.31 and rc.0.

> The `flow` module the worked examples came from has since been deleted, but this is the
> entry to reach for whenever Solid state is handed to a library that drives its own
> pointer events — the workspace canvas included.

**The contract.** Setter writes become visible only after the microtask flush:
`setX(v); x()` returns the **previous** value. Within Solid this is invisible, because
everything that reads `x` is a computation that re-runs after the flush.

**Where it bites.** A library that Solid does not own, driving a DOM event, writing state
through a callback we gave it and then reading that state back through another callback we
gave it — all inside one synchronous handler. `@xyflow/system` does exactly this, twice:

```js
// XYHandle.onPointerMove — startConnection() calls updateConnection(...)
startConnection();
if (!getFromHandle() || !fromHandle) { onPointerUp(event); return; }   // reads it straight back
```

```js
// XYDrag.startDrag — onNodeMouseDown -> handleNodeSelection writes the selection
onNodeMouseDown?.(nodeId);
dragItems = getDragItems(nodeLookup, …);   // then collects every node whose .selected is true
```

**Symptoms, which look nothing like a batching problem.** Connections aborted on the first
pointer move with no console output — a drag that just does nothing. And dragging a node
also dragged whichever node had been selected *before* it, because the drag set was built
from the previous selection. The second is worse than a dead interaction: it silently
corrupts data.

`nodeLookup` made this harder to see. It is a plain `Map` that `adoptUserNodes` mutates from
a memo, so it lags `store.nodes` by a flush even though it is not itself reactive.

**The fix.** An explicit `flush()` at the imperative boundary — the store action the outside
library calls — not at the read site, which we do not own.

- [`packages/ui/src/flow/store/index.ts`](../packages/ui/src/flow/store/index.ts) —
  `updateConnection`, `cancelConnection`, `handleNodeSelection`

**Rule for new code.** When a store action exists to be called by non-Solid code, ask
whether that code reads the result back before yielding. If it can, `flush()` before
returning. Wrapping an imperative library is the case to watch: `d3-drag`, map libraries,
editors and canvas kits all do write-then-read inside a single event.

**Re-check.** `tests/flow.spec.ts`, the `connecting nodes` group and "drags each node in
turn without ever moving a different one". Both fail without the flushes.

---

## Related

- `solid-js/CHEATSHEET.md` in `node_modules` is the most current API reference for the
  pinned beta and takes precedence over the published docs.
- [`onshyft/docs/solidjs2-query-contract-plan.md`](../../onshyft/docs/solidjs2-query-contract-plan.md) —
  the design work these findings came out of.
