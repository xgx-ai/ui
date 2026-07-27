import { render } from "@solidjs/web";
import { createMemo, createSignal, For, isPending, Loading, latest } from "solid-js";

/**
 * Phase 1 browser probe for docs/solidjs2-query-contract-plan.md.
 *
 * Question: when the KEY of an async computation changes, does `<Loading>` (with no `on=`)
 * keep the previously rendered content mounted while the new answer is in flight, and does
 * `isPending` go true?
 *
 * The removal of `query.latest()` depends on the answer being yes.
 *
 * The second and later fetches are held open until "release" is clicked, so the in-flight
 * state can be inspected deterministically rather than raced with a screenshot.
 */

let release: (() => void) | undefined;

function fetchRows(filter: string): Promise<string[]> {
  if (filter === "a") return Promise.resolve(["a-1", "a-2", "a-3"]);
  return new Promise((resolveRows) => {
    release = () => resolveRows([`${filter}-1`, `${filter}-2`]);
  });
}

function App() {
  const [filter, setFilter] = createSignal("a");
  const rows = createMemo(() => fetchRows(filter()));

  return (
    <main>
      <button id="change" type="button" onClick={() => setFilter("b")}>
        change filter
      </button>
      <button id="release" type="button" onClick={() => release?.()}>
        release fetch
      </button>
      <div id="filter">filter={filter()}</div>
      <div id="filter-latest">latest={latest(filter)}</div>

      <Loading fallback={<div id="fallback">FALLBACK</div>}>
        <div id="pending">{isPending(() => rows()) ? "pending" : "idle"}</div>
        <ul id="rows">
          <For each={rows()}>{(row) => <li class="row">{row}</li>}</For>
        </ul>
      </Loading>
    </main>
  );
}

render(() => <App />, document.getElementById("root") as HTMLElement);
