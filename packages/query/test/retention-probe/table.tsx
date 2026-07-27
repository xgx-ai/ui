import { render } from "@solidjs/web";
import { createInfiniteQuery, QueryClient, QueryClientProvider } from "@xgx/query";
import { createMemo, createSignal, For, isPending, Loading, latest } from "solid-js";

/**
 * Probe for issue S1 in docs/solid-2-beta-issues.md.
 *
 * Renders the SAME infinite query twice under one `<Loading>`, through two keyed `<For>`
 * lists:
 *
 * - `#rows-data` reads `query.data()` — the authoritative, suspending read.
 * - `#rows-retained` reads `query.retained()` — the non-suspending workaround.
 *
 * On beta.25 the first list keeps its old children forever after a key change while the
 * second updates. When both update, the renderer bug is fixed and `retained` can be
 * deleted from `@xgx/query` and the table hooks.
 *
 * Drive it from Playwright (`tests/keyed-retention.spec.ts`) or by hand: click "change
 * filter", then "release fetch", and compare the two lists.
 */

let release: (() => void) | undefined;
const calls: string[] = [];
(globalThis as unknown as { probeCalls: string[] }).probeCalls = calls;

type Page = { data: string[]; totalCount: number };

function fetchPage(filter: string, pageParam: number): Promise<Page> {
  calls.push(`${filter}:${pageParam}`);
  const page: Page = {
    data: [`${filter}-${pageParam}a`, `${filter}-${pageParam}b`],
    totalCount: 2,
  };
  if (filter === "a") return Promise.resolve(page);
  return new Promise((resolveRows) => {
    release = () => resolveRows(page);
  });
}

function App() {
  const [filter, setFilter] = createSignal("a");
  const query = createInfiniteQuery(() => ({
    // `latest(filter)` deliberately: during a transition a bare `filter()` still reads the
    // pre-transition value (issue S5), so the key would never change and the query would
    // just refresh the old question. See docs/solid-2-beta-issues.md.
    queryKey: ["rows", latest(filter)],
    initialPageParam: 0,
    queryFn: ({ pageParam }: { pageParam: number }) => fetchPage(latest(filter), pageParam),
    getNextPageParam: () => undefined,
  }));

  const fromData = createMemo(() => query.data().pages.flatMap((page) => page.data));
  const fromRetained = createMemo(() => {
    const held = query.retained();
    return (held ? held.pages : query.data().pages).flatMap((page) => page.data);
  });

  return (
    <main>
      <button id="change" type="button" onClick={() => setFilter("b")}>
        change filter
      </button>
      <button id="release" type="button" onClick={() => release?.()}>
        release fetch
      </button>
      <div id="filter">filter={filter()}</div>

      <Loading fallback={<div id="fallback">FALLBACK</div>}>
        <div id="pending">{isPending(() => query.data()) ? "pending" : "idle"}</div>
        <ul id="rows-data">
          <For each={fromData()}>{(row) => <li class="row-data">{row}</li>}</For>
        </ul>
        <ul id="rows-retained">
          <For each={fromRetained()}>{(row) => <li class="row-retained">{row}</li>}</For>
        </ul>
      </Loading>
    </main>
  );
}

render(
  () => (
    <QueryClientProvider client={new QueryClient()}>
      <App />
    </QueryClientProvider>
  ),
  document.getElementById("root") as HTMLElement,
);
