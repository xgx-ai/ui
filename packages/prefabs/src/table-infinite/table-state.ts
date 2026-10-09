import type { ColumnDef, TableSortingState, TableUpdater } from "@xgx/ui";

/** Orders two cell values: empty first, then dates and numbers by value, then text naturally. */
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

/**
 * The sorting after a column's header is pressed: its first direction, then the other, then
 * off. With `multiple` (Shift), the other sorted columns stay, and a column already in the
 * list keeps its priority.
 */
export function nextTableSorting(
  previous: TableSortingState,
  columnId: string,
  descendingFirst: boolean,
  multiple = false,
): TableSortingState {
  const current = previous.find((sort) => sort.id === columnId);
  const direction = current
    ? current.desc === descendingFirst
      ? !descendingFirst
      : undefined
    : descendingFirst;
  const remaining = multiple ? previous.filter((sort) => sort.id !== columnId) : [];
  if (direction === undefined) return remaining;
  const next = { id: columnId, desc: direction };
  if (multiple && current) {
    return previous.map((sort) => (sort.id === columnId ? next : sort));
  }
  return [...remaining, next];
}

export function getTableColumnId<TData>(column: ColumnDef<TData, unknown>, index = 0): string {
  return column.id ?? column.accessorKey ?? `column-${index}`;
}

/** A cell's value; a dotted `accessorKey` reads a nested field. */
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

/** A column sorts when it has a value to sort by, unless it opts out; `enableSorting: true` opts in. */
export function canSortTableColumn<TData>(column: ColumnDef<TData, unknown>): boolean {
  if (column.enableSorting === false) return false;
  return column.enableSorting === true || Boolean(column.accessorKey || column.accessorFn);
}

/**
 * An ISO 8601 calendar date (`2026-10-09`) or date-time (`2026-10-09T14:30:00.000Z`), as plain
 * dates and instants travel as strings.
 */
const ISO_DATE_PATTERN =
  /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])(?:[T ](?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3])(?::?[0-5]\d)?)?)?$/;

function isIsoDateString(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE_PATTERN.test(value);
}

/**
 * Whether a column's first click sorts descending. `sortDescFirst` on the column decides;
 * otherwise numbers, dates and ISO date strings read largest (latest) first and anything else
 * A to Z, judged by the first row with a value in the column. A source that sorts on the
 * server receives the same first direction.
 */
export function sortsDescendingFirst<TData>(
  column: ColumnDef<TData, unknown>,
  rows: readonly TData[],
): boolean {
  if (column.sortDescFirst !== undefined) return column.sortDescFirst;
  for (let index = 0; index < rows.length; index++) {
    const value = getTableCellValue(rows[index] as TData, index, column);
    if (value == null || value === "") continue;
    return typeof value === "number" || value instanceof Date || isIsoDateString(value);
  }
  return false;
}

export function resolveTableUpdater<T>(updater: TableUpdater<T>, previous: T): T {
  return typeof updater === "function" ? (updater as (previous: T) => T)(previous) : updater;
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

type ClosestTarget = { closest: (selectors: string) => unknown };
type ContainsTarget = { contains: (target: unknown) => boolean };

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

/**
 * Whether a click on a row should open it. A click that lands on a control inside the row —
 * a link, button, input, menu item, or anything marked `data-row-click-ignore` — belongs to
 * that control, so a row menu or an inline checkbox does not also open the row.
 */
export function shouldHandleRowClick(
  event: Pick<MouseEvent, "currentTarget" | "defaultPrevented" | "target">,
): boolean {
  if (event.defaultPrevented) return false;
  if (!hasClosest(event.target) || !hasContains(event.currentTarget)) return true;
  const interactiveTarget = event.target.closest(ROW_CLICK_INTERACTIVE_SELECTOR);
  if (!interactiveTarget) return true;
  return !event.currentTarget.contains(interactiveTarget);
}
