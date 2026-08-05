# Loading retention probe

A hand-driven browser probe, not an automated test. It answers one question that the
headless test runner cannot: **when the key of an async computation changes, does
`<Loading>` (with no `on=`) keep the previously rendered content mounted?**

The removal of `query.latest()` from the query result depends on the answer being yes, so
re-run this whenever the pinned Solid beta moves. See
`onshyft/docs/solidjs2-query-contract-plan.md`.

## Running it

```bash
bun ./packages/query/test/retention-probe/index.html --port=5199
```

Then, in the page:

1. Read the initial state — settled, rows `a-*`.
2. Click **change filter**. The second and later fetches are held open deliberately, so
   the in-flight state can be inspected rather than raced.
3. Read the state again.
4. Click **release fetch** and read the state a third time.

## `table.html` — keyed list probe (issue S1)

Renders one infinite query through two keyed `<For>` lists under a single `<Loading>`:
`#rows-data` reads the suspending `query.data()`, `#rows-retained` reads the non-suspending
`query.retained()` workaround.

**It does not reproduce S1 on beta.25 or beta.26** — both lists update correctly. The
failing ingredient lives somewhere in the real table stack, so this probe cannot currently
answer whether S1 is fixed. Do not delete `retained` on the strength of it; test the
application instead.

It did confirm S5, and more sharply than the original probe: with a query key built from a
bare `filter()`, changing the filter produced a second fetch for the **old** key. The key
must read `latest(filter)` for the query to follow the change at all.

## `index.html` — result on `solid-js` 2.0.0-beta.25, unchanged on beta.31

| Stage | `filter()` | `latest(filter)` | fallback | `isPending` | rows |
| --- | --- | --- | --- | --- | --- |
| Settled | `a` | `a` | hidden | idle | `a-1 a-2 a-3` |
| Key changed, in flight | `a` | **`b`** | **hidden** | **pending** | **`a-1 a-2 a-3`** |
| Settled | `b` | `b` | hidden | idle | `b-1 b-2` |

**This probe cannot be replaced by a headless test.** A `bun test` version — an observed
async memo keyed off a signal, read from outside the render tree — shows the *opposite*
result on beta.31: `filter()` reads `b` the moment the key changes, and only the effect
observing the pending memo waits. The deferral that S5 describes needs reads inside a
rendered tree, which is what this page has and a headless harness does not. Run the page.

Two conclusions:

- **Retention holds across a key change.** The fallback does not re-show and the previous
  rows stay mounted, so `<Loading>` — not a `latest()` mirror on the query result — is what
  keeps content on screen. `<Loading on={key}>` remains the opt-in when the previous
  content would be misleading.
- **The whole update is deferred, not just the boundary.** `filter()` still reads `a`
  during the transition even though it is rendered outside the `<Loading>`. A control bound
  to the key signal would therefore appear unresponsive until the fetch lands. Controls
  must read `latest(keySignal)` to show the in-flight value while the results lag.
