import { render } from "@solidjs/web";
import { createInfiniteQuery, QueryClient, QueryClientProvider } from "@xgx/query";
import { createMemo, createSignal, For, isPending, latest, Loading } from "solid-js";

/**
 * Phase 3 browser probe.
 *
 * The Phase 1 probe proved `<Loading>` retention for a bare async memo. This one proves it
 * for the shape the application actually uses: `createInfiniteQuery` from `@xgx/query`,
 * flattened the way `@xgx/prefabs` flattens pages, rendered under `<Loading>` with no
 * `on=`. Removing `latest()`/`latestData()` from the query result and the table hooks
 * depends on this holding.
 *
 * Fetches after the first are held open until "release" is clicked, so the in-flight state
 * can be inspected rather than raced.
 */

let release: (() => void) | undefined;

type Page = { data: string[]; totalCount: number };

function fetchPage(filter: string, pageParam: number): Promise<Page> {
  const rows = [`${filter}-${pageParam}a`, `${filter}-${pageParam}b`];
  const page: Page = { data: rows, totalCount: 4 };
  if (filter === "a") return Promise.resolve(page);
  return new Promise((resolveRows) => {
    release = () => resolveRows(page);
  });
}

function App() {
  const [filter, setFilter] = createSignal("a");
  const query = createInfiniteQuery(() => ({
    queryKey: ["rows", filter()],
    initialPageParam: 0,
    queryFn: ({ pageParam }: { pageParam: number }) => fetchPage(filter(), pageParam),
    getNextPageParam: (lastPage: Page, allPages: Page[], lastParam: number) => {
      const loaded = allPages.reduce((total, page) => total + page.data.length, 0);
      return loaded >= lastPage.totalCount ? undefined : lastParam + 1;
    },
  }));

  // The prefabs shape: flatten the authoritative read, no mirror.
  const rows = createMemo(() => query.data().pages.flatMap((page) => page.data));

  return (
    <main>
      <button id="change" type="button" onClick={() => setFilter("b")}>
        change filter
      </button>
      <button id="next" type="button" onClick={() => void query.fetchNextPage()}>
        next page
      </button>
      <button id="release" type="button" onClick={() => release?.()}>
        release fetch
      </button>
      <div id="filter">filter={filter()}</div>
      <div id="filter-latest">latest={latest(filter)}</div>
      <div id="cached">cached={query.cached() === undefined ? "none" : "present"}</div>

      <Loading fallback={<div id="fallback">FALLBACK</div>}>
        <div id="pending">{isPending(() => query.data()) ? "pending" : "idle"}</div>
        <ul id="rows">
          <For each={rows()}>{(row) => <li class="row">{row}</li>}</For>
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
