# SolidJS 2 beta: known issues and workarounds

A register of SolidJS 2 beta behaviour we have hit in `@xgx/ui`, `@xgx/query`,
`@xgx/prefabs` and `@xgx/solid`, and what we did about it.

Pinned version: **`solid-js` / `@solidjs/web` / `@solidjs/signals` / `babel-preset-solid`
2.0.0-beta.26**.

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

**Bug.** Confirmed in a browser against the real application on **beta.25 and beta.26**.

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

The valid procedure, used on beta.26:

1. In `use-table.ts` and `use-table-infinite.ts`, make `data` read `query.data()` directly
   instead of preferring `query.retained()`.
2. Restart the frontend dev server (it will not pick up `node_modules` changes otherwise).
3. Filter the clients table and watch two things: the **rows** and the **count chip**.

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

**Bug.** Observed on beta.15. Not reproducible on beta.25 or beta.26 from application code,
but the mechanism has not been shown to be gone. beta.26 fixed a closely related autodispose
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

**Evidence.** [`packages/query/test/retention-probe`](../packages/query/test/retention-probe/README.md)
records the full state table: during the transition `filter()` reads `a` while
`latest(filter)` reads `b`.

---

## S6 — Ancestor context is not preserved through manual portal insertion

**Bug.** Portalled dialog parts lose ancestor context, so the value has to be re-provided
inside the portal.

- [`packages/ui/src/overlays/dialog.tsx`](../packages/ui/src/overlays/dialog.tsx)

---

## S7 — An `undefined` context default is treated as missing

**Sharp edge.** `createContext<T>(undefined)` is indistinguishable from a context with no
default, so a legitimately-`undefined` default cannot be expressed. Use an explicit
sentinel.

- [`packages/ui/src/overlays/dialog.tsx`](../packages/ui/src/overlays/dialog.tsx)

---

## S8 — `lucide-solid` ships Solid 1 output

**Third-party, not Solid.** Icons are compiled against Solid 1, so the Bun plugin applies a
transform. Remove once the package publishes Solid 2 output.

- [`packages/ui/src/bun-plugins/solid.ts`](../packages/ui/src/bun-plugins/solid.ts)

---

## Related

- `solid-js/CHEATSHEET.md` in `node_modules` is the most current API reference for the
  pinned beta and takes precedence over the published docs.
- [`onshyft/docs/solidjs2-query-contract-plan.md`](../../onshyft/docs/solidjs2-query-contract-plan.md) —
  the design work these findings came out of.
