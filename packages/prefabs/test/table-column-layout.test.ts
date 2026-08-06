import { describe, expect, test } from "bun:test";
import {
  moveTableColumn,
  pinnedColumnOffset,
  reconcileTableColumnLayout,
  reorderVisibleTableColumns,
  shouldClearTableSort,
} from "../src/table-infinite/table-infinite";

describe("table column layouts", () => {
  test("drops removed columns and appends new columns visibly", () => {
    expect(
      reconcileTableColumnLayout(["name", "status", "createdAt"], ["name", "status", "createdAt"], {
        version: 1,
        columnOrder: ["removed", "status", "name"],
        hiddenColumnIds: ["removed", "status"],
      }),
    ).toEqual({
      version: 1,
      columnOrder: ["status", "name", "createdAt"],
      hiddenColumnIds: ["status"],
    });
  });

  test("never allows every ordinary column to be hidden", () => {
    const layout = reconcileTableColumnLayout(["name", "status"], ["name", "status"], {
      version: 1,
      columnOrder: ["name", "status"],
      hiddenColumnIds: ["name", "status"],
    });
    expect(layout.hiddenColumnIds).toHaveLength(1);
  });

  test("keeps utility columns outside stored ordering", () => {
    expect(
      reconcileTableColumnLayout(["name", "status"], ["name", "status"], {
        version: 1,
        columnOrder: ["select", "status", "settings", "name", "actions"],
        hiddenColumnIds: [],
      }).columnOrder,
    ).toEqual(["status", "name"]);
  });

  test("moves ordinary columns without changing visibility", () => {
    expect(
      moveTableColumn(
        {
          version: 1,
          columnOrder: ["name", "status", "createdAt"],
          hiddenColumnIds: ["status"],
        },
        "createdAt",
        "name",
      ),
    ).toEqual({
      version: 1,
      columnOrder: ["createdAt", "name", "status"],
      hiddenColumnIds: ["status"],
    });
  });

  test("reorders visible columns while hidden columns retain their slot", () => {
    expect(
      reorderVisibleTableColumns(
        {
          version: 1,
          columnOrder: ["name", "status", "createdAt"],
          hiddenColumnIds: ["status"],
        },
        ["createdAt", "name"],
      ).columnOrder,
    ).toEqual(["createdAt", "status", "name"]);
  });

  test("calculates right-pinned offsets from the right edge", () => {
    const columns = [
      { size: 200 },
      { pinned: "right" as const, size: 56 },
      { pinned: "right" as const, size: 40 },
    ];
    expect(pinnedColumnOffset(columns, 2, "right")).toBe(0);
    expect(pinnedColumnOffset(columns, 1, "right")).toBe(40);
  });

  test("clears sorting when its column becomes hidden", () => {
    expect(
      shouldClearTableSort("status", {
        version: 1,
        columnOrder: ["name", "status"],
        hiddenColumnIds: ["status"],
      }),
    ).toBe(true);
  });
});
