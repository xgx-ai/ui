import { expect, test } from "bun:test";
import { createInfiniteQuery, infiniteQuery, QueryClient, queryGroup } from "@xgx/query";
import { action, createEffect, createRoot, createSignal, flush, resolve } from "solid-js";
import { useTableInfiniteFromQuery } from "../src/table-infinite/use-table-infinite";

function nextTask() {
  return new Promise<void>((resolveTask) => setTimeout(resolveTask, 0));
}

test("table rows react when an infinite query key changes", async () => {
  let dispose = () => {};
  const run = createRoot((disposeRoot) => {
    dispose = disposeRoot;
    const client = new QueryClient();
    const [filter, setFilter] = createSignal("all");
    const calls: string[] = [];
    const observedRows: string[][] = [];
    const group = queryGroup("table", {
      rows: infiniteQuery({
        key: (currentFilter: string) => ({ filter: currentFilter }),
        initialPageParam: 0,
        fetch: async (key) => {
          calls.push(key.filter);
          return {
            data: [key.filter],
            count: 1,
            totalCount: 1,
          };
        },
      }),
    });
    const query = createInfiniteQuery(() => group.rows(filter()), client);
    const table = useTableInfiniteFromQuery<string, number>({ query });
    const changeFilter = action(function* (value: string) {
      setFilter(value);
      yield Promise.resolve();
    });

    createEffect(
      () => table.data(),
      (rows) => {
        observedRows.push(rows);
      },
    );

    return { calls, changeFilter, observedRows, table };
  });

  try {
    await resolve(() => run.table.data());
    flush();
    expect(run.table.data()).toEqual(["all"]);

    void run.changeFilter("active");
    flush();
    await nextTask();

    expect(run.calls).toEqual(["all", "active"]);
    expect(run.table.data()).toEqual(["active"]);
    expect(run.observedRows.at(-1)).toEqual(["active"]);
  } finally {
    dispose();
  }
});
