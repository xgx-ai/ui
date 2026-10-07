import type { Accessor } from "solid-js";
import type {
  ColumnDef,
  TableColumn,
  TableSortingState as SortingState,
  TableUpdater as Updater,
} from "./table-types.ts";

export function compareTableValues(left: unknown, right: unknown): number {
  if (left == null && right == null) return 0;
  if (left == null) return -1;
  if (right == null) return 1;
  if (left instanceof Date && right instanceof Date) return left.getTime() - right.getTime();
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

interface TableColumnOptions<TData> {
  data: Accessor<TData[]>;
  enabled: Accessor<boolean>;
  sorting: Accessor<SortingState>;
  setSorting: (updater: Updater<SortingState>) => void;
}

/** Server sorting follows the existing first-direction and three-state cycle. */
export function nextTableSorting(
  previous: SortingState,
  columnId: string,
  descendingFirst: boolean,
  multiple = false,
): SortingState {
  const current = previous.find((sort) => sort.id === columnId);
  const direction = current
    ? current.desc === descendingFirst
      ? !descendingFirst
      : undefined
    : descendingFirst;
  const remaining = multiple ? previous.filter((sort) => sort.id !== columnId) : [];
  if (direction === undefined) return remaining;
  const next = { id: columnId, desc: direction };
  // Preserve priority when cycling an existing multi-sort column.
  if (multiple && current) {
    return previous.map((sort) => (sort.id === columnId ? next : sort));
  }
  return [...remaining, next];
}

export function getTableColumnId<TData>(column: ColumnDef<TData>, index = 0): string {
  return column.id ?? column.accessorKey ?? `column-${index}`;
}

export function getTableCellValue<TData, TValue>(
  row: TData,
  index: number,
  column: ColumnDef<TData, TValue>,
): TValue {
  if (column.accessorFn) return column.accessorFn(row, index);
  if (!column.accessorKey) return undefined as TValue;
  return column.accessorKey
    .split(".")
    .reduce<unknown>(
      (value, key) => (value == null ? undefined : (value as Record<string, unknown>)[key]),
      row,
    ) as TValue;
}

export function createTableColumn<TData>(
  columnDef: ColumnDef<TData>,
  index: number,
  options: TableColumnOptions<TData>,
): TableColumn<TData> {
  const id = getTableColumnId(columnDef, index);
  const descendingFirst = () => {
    const explicit = (columnDef as ColumnDef<TData> & { sortDescFirst?: boolean }).sortDescFirst;
    if (explicit !== undefined) return explicit;
    const firstRow = options.data()[0];
    const value = firstRow === undefined ? undefined : getTableCellValue(firstRow, 0, columnDef);
    return typeof value === "number" || value instanceof Date;
  };
  const column: TableColumn<TData> = {
    id,
    index,
    columnDef,
    getCanSort: () =>
      options.enabled() &&
      columnDef.enableSorting !== false &&
      (columnDef.enableSorting === true || Boolean(columnDef.accessorKey || columnDef.accessorFn)),
    getIsSorted: () => {
      const sort = options.sorting().find((sort) => sort.id === id);
      return sort ? (sort.desc ? "desc" : "asc") : false;
    },
    getToggleSortingHandler: () => (event) => {
      if (!column.getCanSort()) return;
      const multiple = Boolean((event as { shiftKey?: boolean } | undefined)?.shiftKey);
      const firstDirection = descendingFirst();
      options.setSorting((previous) => nextTableSorting(previous, id, firstDirection, multiple));
    },
  };
  return column;
}

const ROW_CLICK_INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "[contenteditable='true']",
  "[role='button']",
  "[role='checkbox']",
  "[role='link']",
  "[role='menuitem']",
  "[data-row-click-ignore]",
].join(", ");

type ClosestTarget = {
  closest: (selectors: string) => unknown;
};

type ContainsTarget = {
  contains: (target: unknown) => boolean;
};

function hasClosest(value: EventTarget | null): value is EventTarget & ClosestTarget {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as unknown as ClosestTarget).closest === "function"
  );
}

function hasContains(value: EventTarget | null): value is EventTarget & ContainsTarget {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as unknown as ContainsTarget).contains === "function"
  );
}

export function shouldHandleRowClick(
  event: Pick<MouseEvent, "currentTarget" | "defaultPrevented" | "target">,
): boolean {
  if (event.defaultPrevented) {
    return false;
  }

  if (!hasClosest(event.target) || !hasContains(event.currentTarget)) {
    return true;
  }

  const interactiveTarget = event.target.closest(ROW_CLICK_INTERACTIVE_SELECTOR);
  if (!interactiveTarget) {
    return true;
  }

  return !event.currentTarget.contains(interactiveTarget);
}
