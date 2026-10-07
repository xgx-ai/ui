import { createRoot, createSignal, flush } from "solid-js";
import {
  compareTableValues,
  createTableColumn,
  getTableCellValue,
  getTableColumnId,
  nextTableSorting,
  shouldHandleRowClick,
} from "../src/table-state.ts";
import type { ColumnDef, TableSortingState } from "../src/table-types.ts";

function equal(actual: unknown, expected: unknown, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
}

export default function runTableStateSpec() {
  equal(
    nextTableSorting([], "name", false),
    [{ id: "name", desc: false }],
    "text sorts ascending first",
  );
  equal(
    nextTableSorting([{ id: "name", desc: false }], "name", false),
    [{ id: "name", desc: true }],
    "text sort cycles descending",
  );
  equal(
    nextTableSorting([{ id: "name", desc: true }], "name", false),
    [],
    "third click removes sorting",
  );
  equal(
    nextTableSorting([{ id: "amount", desc: true }], "name", false, true),
    [
      { id: "amount", desc: true },
      { id: "name", desc: false },
    ],
    "Shift preserves primary sorting",
  );
  equal(
    nextTableSorting(
      [
        { id: "amount", desc: true },
        { id: "name", desc: false },
      ],
      "amount",
      true,
      true,
    ),
    [
      { id: "amount", desc: false },
      { id: "name", desc: false },
    ],
    "cycling a multi-sort preserves priority",
  );
  equal(
    nextTableSorting(
      [
        { id: "amount", desc: false },
        { id: "name", desc: false },
      ],
      "amount",
      true,
      true,
    ),
    [{ id: "name", desc: false }],
    "removing one sort leaves the others",
  );

  let dispose = () => {};
  const state = createRoot((cleanup) => {
    dispose = cleanup;
    const data = [{ id: "a", name: "Charlie", amount: 30, date: new Date("2026-10-07") }];
    const [sorting, setSorting] = createSignal<TableSortingState>([]);
    let calls = 0;
    const options = {
      data: () => data,
      enabled: () => true,
      sorting,
      setSorting: (updater: Parameters<typeof setSorting>[0]) => {
        calls += 1;
        setSorting(updater);
      },
    };
    return {
      data,
      sorting,
      calls: () => calls,
      text: createTableColumn({ accessorKey: "name", enableSorting: true }, 0, options),
      number: createTableColumn({ accessorKey: "amount" }, 1, options),
      date: createTableColumn({ accessorKey: "date" }, 2, options),
      explicit: createTableColumn({ accessorKey: "amount", sortDescFirst: false }, 3, options),
      disabled: createTableColumn({ id: "actions", enableSorting: false }, 4, options),
    };
  });
  try {
    state.text.getToggleSortingHandler()();
    flush();
    equal(
      state.sorting(),
      [{ id: "name", desc: false }],
      "native columns call the controlled setter",
    );
    equal(state.text.getIsSorted(), "asc", "header reflects the controlled state");
    equal(state.data[0]?.name, "Charlie", "server rows are left in supplied order");
    state.number.getToggleSortingHandler()();
    flush();
    equal(state.sorting(), [{ id: "amount", desc: true }], "numeric sorting starts descending");
    state.date.getToggleSortingHandler()();
    flush();
    equal(state.sorting(), [{ id: "date", desc: true }], "date sorting starts descending");
    state.explicit.getToggleSortingHandler()();
    flush();
    equal(
      state.sorting(),
      [{ id: "amount", desc: false }],
      "sortDescFirst overrides the inferred direction",
    );
    state.disabled.getToggleSortingHandler()();
    flush();
    equal(state.calls(), 4, "disabled columns never request a sort");
  } finally {
    dispose();
  }

  type NestedRow = { contact: { name: string }; amount: number };
  const row = { contact: { name: "Adam" }, amount: 20 };
  equal(
    getTableCellValue(row, 0, { accessorKey: "contact.name" } satisfies ColumnDef<NestedRow>),
    "Adam",
    "dotted accessors resolve nested values",
  );
  equal(
    getTableCellValue(row, 3, { accessorFn: (value, index) => value.amount + index }),
    23,
    "accessor functions receive the row index",
  );
  equal(
    getTableColumnId({ accessorKey: "contact.name" }),
    "contact.name",
    "accessor keys provide stable column identity",
  );
  equal(compareTableValues(10, 2), 8, "numbers compare numerically");
  equal(compareTableValues("Row 2", "Row 10") < 0, true, "text compares natural numeric order");
  equal(compareTableValues(null, 2), -1, "missing values have a stable order");

  const interactive = {};
  const rowElement = {
    contains: (element: unknown) => element === interactive,
  } as unknown as EventTarget;
  const event = (match: unknown, defaultPrevented = false) => ({
    currentTarget: rowElement,
    defaultPrevented,
    target: { closest: () => match } as unknown as EventTarget,
  });
  equal(shouldHandleRowClick(event(interactive)), false, "nested controls do not open the row");
  equal(shouldHandleRowClick(event(null)), true, "ordinary cells open the row");
  equal(shouldHandleRowClick(event(null, true)), false, "prevented events do not open the row");
  equal(shouldHandleRowClick(event({})), true, "controls outside the row are ignored");
  console.log("ok - table: controlled sorting, values and interactive row-click exclusions");
}
