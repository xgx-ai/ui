import { describe, expect, test } from "bun:test";
import type { ColumnDef } from "@xgx/ui";
import {
  canSortTableColumn,
  compareTableValues,
  getTableCellValue,
  getTableColumnId,
  nextTableSorting,
  shouldHandleRowClick,
  sortsDescendingFirst,
} from "../src/table-infinite/table-state";

describe("table sorting", () => {
  test("cycles text columns ascending, descending, then off", () => {
    expect(nextTableSorting([], "name", false)).toEqual([{ id: "name", desc: false }]);
    expect(nextTableSorting([{ id: "name", desc: false }], "name", false)).toEqual([
      { id: "name", desc: true },
    ]);
    expect(nextTableSorting([{ id: "name", desc: true }], "name", false)).toEqual([]);
  });

  test("Shift keeps the primary sort and preserves priority", () => {
    expect(nextTableSorting([{ id: "amount", desc: true }], "name", false, true)).toEqual([
      { id: "amount", desc: true },
      { id: "name", desc: false },
    ]);
    expect(
      nextTableSorting(
        [
          { id: "amount", desc: true },
          { id: "name", desc: false },
        ],
        "amount",
        true,
        true,
      ),
    ).toEqual([
      { id: "amount", desc: false },
      { id: "name", desc: false },
    ]);
    expect(
      nextTableSorting(
        [
          { id: "amount", desc: false },
          { id: "name", desc: false },
        ],
        "amount",
        true,
        true,
      ),
    ).toEqual([{ id: "name", desc: false }]);
  });

  test("columns sort when they have a value, and numbers and dates start descending", () => {
    const row = { id: "a", name: "Charlie", amount: 30, date: new Date("2026-10-07") };
    expect(canSortTableColumn({ accessorKey: "name" })).toBe(true);
    expect(canSortTableColumn({ id: "derived", accessorFn: () => 1 })).toBe(true);
    expect(canSortTableColumn({ id: "actions" })).toBe(false);
    expect(canSortTableColumn({ id: "actions", enableSorting: true })).toBe(true);
    expect(canSortTableColumn({ accessorKey: "name", enableSorting: false })).toBe(false);

    expect(sortsDescendingFirst({ accessorKey: "name" }, row)).toBe(false);
    expect(sortsDescendingFirst({ accessorKey: "amount" }, row)).toBe(true);
    expect(sortsDescendingFirst({ accessorKey: "date" }, row)).toBe(true);
    expect(sortsDescendingFirst({ accessorKey: "amount", sortDescFirst: false }, row)).toBe(false);
    expect(sortsDescendingFirst({ accessorKey: "amount" }, undefined)).toBe(false);
  });
});

describe("table values", () => {
  type NestedRow = { contact: { name: string }; amount: number };
  const row = { contact: { name: "Adam" }, amount: 20 };

  test("resolves dotted accessors and accessor functions", () => {
    const contactName: ColumnDef<NestedRow> = { accessorKey: "contact.name" };
    expect(getTableCellValue(row, 0, contactName)).toBe("Adam");
    expect(
      getTableCellValue(row, 3, {
        accessorFn: (value: NestedRow, index: number) => value.amount + index,
      }),
    ).toBe(23);
    expect(getTableColumnId({ accessorKey: "contact.name" })).toBe("contact.name");
  });

  test("compares numbers, natural text and missing values", () => {
    expect(compareTableValues(10, 2)).toBe(8);
    expect(compareTableValues("Row 2", "Row 10")).toBeLessThan(0);
    expect(compareTableValues(null, 2)).toBe(-1);
  });
});

describe("row clicks", () => {
  const interactive = {};
  const rowElement = {
    contains: (element: unknown) => element === interactive,
  } as unknown as EventTarget;
  const event = (match: unknown, defaultPrevented = false) => ({
    currentTarget: rowElement,
    defaultPrevented,
    target: { closest: () => match } as unknown as EventTarget,
  });

  test("ignores nested controls and prevented events", () => {
    expect(shouldHandleRowClick(event(interactive))).toBe(false);
    expect(shouldHandleRowClick(event(null))).toBe(true);
    expect(shouldHandleRowClick(event(null, true))).toBe(false);
    expect(shouldHandleRowClick(event({}))).toBe(true);
  });
});
