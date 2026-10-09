import { type Accessor, createMemo, createProjection, createSignal } from "solid-js";
import { type InfiniteQueryResult } from "../../../query/src/index.tsx";

export interface TableInfinitePage<TData> {
  data: TData[];
  count: number;
  totalCount?: number;
}

export interface UseTableInfiniteFromQueryParams<TData, TPage, TPageParam = unknown> {
  query: InfiniteQueryResult<TPage, TPageParam>;
  getRows: (page: TPage) => readonly TData[];
  getCount?: (page: TPage) => number | undefined;
  getTotalCount?: (page: TPage) => number | undefined;
  /**
   * A row's stable identity, defaulting to its `id`. A refetch is reconciled by it, so a row
   * that survives keeps its object and its rendered row, and selection is tracked by it.
   * Rows without one are never matched to an earlier row.
   */
  getRowId?: (row: TData) => string | number | undefined;
  singleSelect?: boolean;
  /**
   * Unique identifier for the table, used for persisting state like column visibility.
   */
  tableId?: string;
}

export interface UseTableInfiniteFromDefaultQueryParams<TData, TPageParam = unknown>
  extends Omit<
    UseTableInfiniteFromQueryParams<TData, TableInfinitePage<TData>, TPageParam>,
    "getRows" | "getCount" | "getTotalCount" | "query"
  > {
  query: InfiniteQueryResult<TableInfinitePage<TData>, TPageParam>;
  getRows?: (page: TableInfinitePage<TData>) => readonly TData[];
  getCount?: (page: TableInfinitePage<TData>) => number | undefined;
  getTotalCount?: (page: TableInfinitePage<TData>) => number | undefined;
}

export interface UseTableInfiniteReturn<
  TData,
  TPage = TableInfinitePage<TData>,
  TPageParam = unknown,
> {
  data: Accessor<TData[]>;
  query: InfiniteQueryResult<TPage, TPageParam>;
  isLoading: Accessor<boolean>;
  isFetchingMore: Accessor<boolean>;
  hasMore: Accessor<boolean>;
  loadMore: () => void;
  refetch: () => void;
  count: Accessor<number | undefined>;
  totalCount: Accessor<number | undefined>;

  selected: Accessor<TData[]>;
  allSelected: Accessor<boolean>;
  excludedIds: Accessor<string[]>;
  toggleRowSelection: (row: TData, checked: boolean) => void;
  toggleSelectAll: (checked: boolean) => void;
  isRowSelected: (row: TData) => boolean;
  selectedCount: Accessor<number>;
  setSelected: (selected: TData[]) => void;
  singleSelect: boolean;
  /**
   * Unique identifier for the table, used for persisting state like column visibility.
   */
  tableId: string;
}

function getDefaultRows<TData>(page: TableInfinitePage<TData>): readonly TData[] {
  return page.data;
}

function getDefaultCount<TData>(page: TableInfinitePage<TData>): number | undefined {
  return page.count;
}

function getDefaultTotalCount<TData>(page: TableInfinitePage<TData>): number | undefined {
  return page.totalCount;
}

function getDefaultRowId(row: unknown): string | number | undefined {
  const id = (row as { id?: unknown } | null | undefined)?.id;
  return typeof id === "string" || typeof id === "number" ? id : undefined;
}

/**
 * The reconciliation key for a table's rows.
 *
 * Solid applies a projection's `key` at every depth, so it is given only to objects that
 * arrived as rows; anything nested inside a row merges by position within that row. A row
 * with no identity gets a key of its own rather than falling back to its position, which
 * would hand its object, and anything holding it, to whichever row took its place.
 */
function createRowKey<TData>(getRowId: (row: TData) => string | number | undefined) {
  const rows = new WeakSet<object>();
  const unkeyed = new WeakMap<object, symbol>();

  const key = (item: object): unknown => {
    if (!rows.has(item)) return undefined;
    const id = getRowId(item as TData);
    if (id !== undefined) return id;
    let own = unkeyed.get(item);
    if (own === undefined) {
      own = Symbol("unkeyed row");
      unkeyed.set(item, own);
    }
    return own;
  };
  const register = (incoming: TData[]) => {
    for (const row of incoming) {
      if (row !== null && typeof row === "object") rows.add(row);
    }
    return incoming;
  };

  return { key, register };
}

/**
 * Rows that keep their objects across refetches. Each new answer is reconciled into the last by
 * `getRowId` (default `row.id`), so a surviving row is the same object and only the fields that
 * changed notify; the array itself is new whenever membership or order changes. Pass plain rows,
 * as a transport returns them.
 *
 * `useTableInfiniteFromQuery` does this already. Use it for rows a table gets from elsewhere, so
 * a refetch does not remount every row, and everything a row owns, such as an open dialog.
 */
export function createReconciledRows<TData>(
  rows: Accessor<TData[]>,
  options: { getRowId?: (row: TData) => string | number | undefined; name?: string } = {},
): Accessor<TData[]> {
  const rowKey = createRowKey<TData>(options.getRowId ?? getDefaultRowId);
  const reconciled = createProjection<TData[]>(() => rowKey.register(rows()), [], {
    key: rowKey.key,
    name: options.name ?? "tableRows",
  });
  return createMemo(() => [...reconciled]);
}

export function useTableInfiniteFromQuery<TData, TPageParam = unknown>(
  params: UseTableInfiniteFromDefaultQueryParams<TData, TPageParam>,
): UseTableInfiniteReturn<TData, TableInfinitePage<TData>, TPageParam>;
export function useTableInfiniteFromQuery<TData, TPage, TPageParam = unknown>(
  params: UseTableInfiniteFromQueryParams<TData, TPage, TPageParam>,
): UseTableInfiniteReturn<TData, TPage, TPageParam>;
export function useTableInfiniteFromQuery<TData, TPage, TPageParam = unknown>(
  params:
    | UseTableInfiniteFromQueryParams<TData, TPage, TPageParam>
    | UseTableInfiniteFromDefaultQueryParams<TData, TPageParam>,
): UseTableInfiniteReturn<TData, TPage, TPageParam> {
  const singleSelect = params.singleSelect ?? false;
  const query = params.query as InfiniteQueryResult<TPage, TPageParam>;
  const getRows =
    "getRows" in params && params.getRows
      ? (params.getRows as (page: TPage) => readonly TData[])
      : (page: TPage) => getDefaultRows(page as TableInfinitePage<TData>);
  const getCount =
    "getCount" in params && params.getCount
      ? (params.getCount as (page: TPage) => number | undefined)
      : (page: TPage) => getDefaultCount(page as TableInfinitePage<TData>);
  const getTotalCount =
    "getTotalCount" in params && params.getTotalCount
      ? (params.getTotalCount as (page: TPage) => number | undefined)
      : (page: TPage) => getDefaultTotalCount(page as TableInfinitePage<TData>);

  const getRowId = params.getRowId ?? getDefaultRowId;

  const flattenPages = (pages: readonly TPage[] | undefined): TData[] =>
    pages?.flatMap((page) => [...getRows(page)]) ?? [];

  /*
   * A refetch answers with entirely new objects, so without reconciliation every row would
   * be a new row: a keyed `<For>` would remount all of them, and anything a row owns — an
   * open menu, a dialog waiting on its own save — would be torn down with it. Reconciled by
   * row identity, a surviving row keeps its object and only the fields that changed notify.
   *
   * Reads `retained`, not `data`: a keyed `<For>` under `<Loading>` does not pick up the
   * new value in Solid 2 beta.25, so a filtered table would stay stuck on old rows. The
   * first read still suspends, because `retained` is undefined until something resolves.
   */
  const data = createReconciledRows(
    () => {
      const retained = query.retained();
      return flattenPages(retained ? retained.pages : query.data().pages);
    },
    { getRowId, name: params.tableId ? `${params.tableId}.rows` : undefined },
  );

  const count = createMemo(() => {
    const pages = query.cached()?.pages;
    if (!pages || pages.length === 0) return undefined;
    const lastPage = pages[pages.length - 1];
    return getCount(lastPage);
  });

  const totalCount = createMemo(() => {
    const pages = query.cached()?.pages;
    if (!pages || pages.length === 0) return undefined;
    const lastPage = pages[pages.length - 1];
    return getTotalCount(lastPage);
  });

  const loadMore = () => {
    if (query.hasNextPage() && !query.fetchingNextPage()) {
      void query.fetchNextPage();
    }
  };

  const refetch = () => {
    void query.refetch();
  };

  // No cached value for the current key yet, so nothing can be shown. `<Loading>` owns
  // the first read; this is for chrome that renders outside the boundary.
  const isLoading = createMemo(() => query.fetching() && query.cached() === undefined);
  const isFetchingMore = createMemo(() => query.fetchingNextPage());
  const hasMore = createMemo(() => query.hasNextPage());

  const [selected, setSelected] = createSignal<TData[]>([]);
  const [allSelected, setAllSelected] = createSignal<boolean>(false);
  const [excludedIds, setExcludedIds] = createSignal<string[]>([]);

  const selectionId = (row: TData) => {
    const id = getRowId(row);
    return id === undefined ? undefined : String(id);
  };

  const isRowSelected = (row: TData) => {
    const rowId = selectionId(row);
    if (rowId === undefined) return false;
    if (allSelected()) {
      return !new Set(excludedIds()).has(rowId);
    }
    return selected().findIndex((x) => selectionId(x) === rowId) !== -1;
  };

  const toggleRowSelection = (row: TData, checked: boolean) => {
    const rowId = selectionId(row);
    if (rowId === undefined) return;

    if (singleSelect) {
      if (checked) {
        setSelected([row]);
      } else {
        setSelected([]);
      }
      setAllSelected(false);
      setExcludedIds([]);
      return;
    }

    if (allSelected()) {
      if (!checked) {
        setExcludedIds((prev) => (prev.includes(rowId) ? prev : [...prev, rowId]));
      } else {
        setExcludedIds((prev) => prev.filter((id) => id !== rowId));
      }
    } else {
      if (checked) {
        setSelected((prev) => (prev.some((x) => selectionId(x) === rowId) ? prev : [...prev, row]));
      } else {
        setSelected((prev) => prev.filter((x) => selectionId(x) !== rowId));
      }
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setAllSelected(true);
      setExcludedIds([]);
      setSelected([]);
    } else {
      setAllSelected(false);
      setExcludedIds([]);
      setSelected([]);
    }
  };

  const selectedCount = createMemo(() => {
    if (allSelected()) {
      const base = data().length;
      const excluded = excludedIds().length;
      return Math.min(5000, Math.max(0, base - excluded));
    }
    return Math.min(5000, selected().length);
  });

  return {
    data,
    query,
    isLoading,
    isFetchingMore,
    hasMore,
    loadMore,
    refetch,
    count,
    totalCount,

    selected,
    allSelected,
    excludedIds,
    toggleRowSelection,
    toggleSelectAll,
    isRowSelected,
    selectedCount,
    setSelected,
    singleSelect,
    tableId: params.tableId ?? "table",
  };
}
