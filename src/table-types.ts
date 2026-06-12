import type { JSX } from "@solidjs/web";
import type { Accessor } from "solid-js";

export type SortDirection = false | "asc" | "desc";

export interface TableColumnMeta {
  displayName?: string;
  pinned?: "left" | "right" | string;
  [key: string]: unknown;
}

export interface TableRowContext<TData> {
  id: string;
  index: number;
  original: TData;
  getIsSelected: () => boolean;
}

export interface TableColumn<TData, TValue = unknown> {
  id: string;
  index: number;
  columnDef: ColumnDef<TData, TValue>;
  getCanSort: () => boolean;
  getIsSorted: () => SortDirection;
  getToggleSortingHandler: () => (event?: unknown) => void;
}

export interface HeaderContext<TData, TValue = unknown> {
  column: TableColumn<TData, TValue>;
}

export interface CellContext<TData, TValue = unknown> {
  row: TableRowContext<TData>;
  column: TableColumn<TData, TValue>;
  getValue: () => TValue;
}

export interface ColumnDef<TData, TValue = unknown> {
  id?: string;
  accessorKey?: Extract<keyof TData, string> | string;
  accessorFn?: (row: TData, index: number) => TValue;
  header?: JSX.Element | ((context: HeaderContext<TData, TValue>) => JSX.Element);
  cell?: JSX.Element | ((context: CellContext<TData, TValue>) => JSX.Element);
  size?: number;
  enableSorting?: boolean;
  meta?: TableColumnMeta;
}

export interface TableController<TData> {
  data: Accessor<TData[]>;
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
  tableId?: string;
}
