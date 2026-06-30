import { expect, test } from "bun:test";
import { createRoot, createSignal, flush } from "solid-js";
import { useTableFilters } from "../src/table-infinite/use-table-filters";

type TestFilters = {
  search?: string;
  status?: string;
};

type TestSearch = {
  filters?: Record<string, Record<string, unknown>>;
};

function withTableFilters(
  initialSearch: TestSearch,
  run: (context: {
    filters: ReturnType<typeof useTableFilters<TestFilters>>;
    navigateCalls: TestSearch[];
    search: () => TestSearch;
  }) => void,
) {
  createRoot((dispose) => {
    const [search, setSearch] = createSignal<TestSearch>(initialSearch);
    const navigateCalls: TestSearch[] = [];
    const filters = useTableFilters<TestFilters>({
      tableId: "clients",
      search,
      navigate: (opts) => {
        const next = opts.search(search());
        navigateCalls.push(next);
        setSearch(next);
      },
    });

    try {
      run({ filters, navigateCalls, search });
    } finally {
      dispose();
    }
  });
}

test("setFilter does not navigate when the value is unchanged", () => {
  withTableFilters(
    {
      filters: {
        clients: {
          search: "north",
        },
      },
    },
    ({ filters, navigateCalls }) => {
      filters.setFilter("search", "north");

      expect(navigateCalls).toHaveLength(0);
    },
  );
});

test("setFilter removes the filters object when clearing the only table filter", () => {
  withTableFilters(
    {
      filters: {
        clients: {
          search: "north",
        },
      },
    },
    ({ filters, navigateCalls, search }) => {
      filters.setFilter("search", undefined);
      flush();

      expect(navigateCalls).toHaveLength(1);
      expect(search()).toEqual({});
    },
  );
});

test("resetFilters does not navigate when the table has no filters", () => {
  withTableFilters({}, ({ filters, navigateCalls }) => {
    filters.resetFilters();

    expect(navigateCalls).toHaveLength(0);
  });
});
