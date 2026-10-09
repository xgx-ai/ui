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

type Row = { id?: string; code?: string; name: string; tags: { label: string }[] };

/**
 * A table over a query whose fetch answers from `serve`, as fresh JSON each time, the way a
 * real transport does.
 */
function createServedTable(
  serve: () => Row[],
  options: { getRowId?: (row: Row) => string | undefined } = {},
) {
  let dispose = () => {};
  const run = createRoot((disposeRoot) => {
    dispose = disposeRoot;
    const client = new QueryClient();
    const group = queryGroup("served-table", {
      rows: infiniteQuery({
        key: () => ({}),
        initialPageParam: 0,
        fetch: async () => {
          const data = JSON.parse(JSON.stringify(serve())) as Row[];
          return { data, count: data.length, totalCount: data.length };
        },
      }),
    });
    const query = createInfiniteQuery(() => group.rows(), client);
    const table = useTableInfiniteFromQuery<Row, number>({
      query,
      getRowId: options.getRowId,
    });
    return { query, table };
  });
  return { ...run, dispose };
}

/** Records every value an effect sees for each row's `name`, from the row object itself. */
function watchNames(rows: readonly Row[]) {
  const reads: string[] = [];
  const dispose = createRoot((disposeRoot) => {
    for (const row of rows) {
      createEffect(
        () => row.name,
        (name) => {
          reads.push(name);
        },
      );
    }
    return disposeRoot;
  });
  flush();
  reads.length = 0;
  return { dispose, reads };
}

async function refetch(run: { query: { refetch: () => Promise<unknown> } }) {
  await run.query.refetch();
  flush();
  await nextTask();
  flush();
}

test("a refetch keeps surviving rows and notifies only the fields that changed", async () => {
  let served: Row[] = [
    { id: "a", name: "Alpha", tags: [{ label: "x" }] },
    { id: "b", name: "Bravo", tags: [] },
    { id: "c", name: "Charlie", tags: [] },
  ];
  const run = createServedTable(() => served);
  let names: ReturnType<typeof watchNames> | undefined;
  try {
    await resolve(() => run.table.data());
    flush();
    const [alpha, bravo] = run.table.data();
    if (!alpha || !bravo) throw new Error("Rows did not load");
    names = watchNames([alpha, bravo]);

    served = [
      { id: "a", name: "Alpha (renamed)", tags: [{ label: "y" }] },
      { id: "b", name: "Bravo", tags: [] },
      { id: "d", name: "Delta", tags: [] },
    ];
    await refetch(run);

    const rows = run.table.data();
    expect(rows.map((row) => row.name)).toEqual(["Alpha (renamed)", "Bravo", "Delta"]);
    expect(rows[0]).toBe(alpha);
    expect(rows[1]).toBe(bravo);
    expect(rows[0]?.tags[0]?.label).toBe("y");
    // Bravo's reader is not woken by Alpha's rename.
    expect(names.reads).toEqual(["Alpha (renamed)"]);
  } finally {
    names?.dispose();
    run.dispose();
  }
});

test("rows are matched by getRowId when they have no id", async () => {
  let served: Row[] = [
    { code: "one", name: "One", tags: [] },
    { code: "two", name: "Two", tags: [] },
  ];
  const run = createServedTable(() => served, { getRowId: (row) => row.code });
  try {
    await resolve(() => run.table.data());
    flush();
    const [one, two] = run.table.data();

    served = [
      { code: "two", name: "Two", tags: [] },
      { code: "one", name: "One (edited)", tags: [] },
    ];
    await refetch(run);

    const rows = run.table.data();
    expect(rows[0]).toBe(two);
    expect(rows[1]).toBe(one);
    expect(one?.name).toBe("One (edited)");
  } finally {
    run.dispose();
  }
});

test("a row with no identity is never handed to the row that takes its place", async () => {
  let served: Row[] = [
    { name: "First", tags: [] },
    { name: "Second", tags: [] },
  ];
  const run = createServedTable(() => served);
  try {
    await resolve(() => run.table.data());
    flush();
    const [first] = run.table.data();

    served = [
      { name: "Second", tags: [] },
      { name: "First", tags: [] },
    ];
    await refetch(run);

    // Matched by position, the object held as "First" would now read "Second".
    expect(first?.name).toBe("First");
    expect(run.table.data().map((row) => row.name)).toEqual(["Second", "First"]);
  } finally {
    run.dispose();
  }
});

test("selection follows getRowId", async () => {
  const served: Row[] = [
    { code: "one", name: "One", tags: [] },
    { code: "two", name: "Two", tags: [] },
  ];
  const run = createServedTable(() => served, { getRowId: (row) => row.code });
  try {
    await resolve(() => run.table.data());
    flush();
    const [one, two] = run.table.data();
    if (!one || !two) throw new Error("Rows did not load");

    run.table.toggleRowSelection(one, true);
    flush();
    expect(run.table.isRowSelected(one)).toBe(true);
    expect(run.table.isRowSelected(two)).toBe(false);

    await refetch(run);
    // The reconciled row is the same object, so it is still the selected one.
    expect(run.table.isRowSelected(run.table.data()[0] as Row)).toBe(true);
  } finally {
    run.dispose();
  }
});
