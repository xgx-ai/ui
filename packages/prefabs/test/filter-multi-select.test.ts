import { expect, test } from "bun:test";
import { addFilterMultiSelectValue } from "../src/table-infinite/filter-fields/filter-multi-select";

const north = { value: "north", label: "North" };
const south = { value: "south", label: "South" };
const east = { value: "east", label: "East" };

test("the first pick becomes the selection", () => {
  expect(addFilterMultiSelectValue([], [north])).toEqual(["north"]);
});

test("a second pick is added even though Search reports the existing value first", () => {
  // Search hands over the whole selection, existing values included. Taking the first entry
  // read the already-selected value back and dropped the new pick.
  expect(addFilterMultiSelectValue(["north"], [north, south])).toEqual(["north", "south"]);
});

test("the new pick is found wherever Search puts it", () => {
  expect(addFilterMultiSelectValue(["north", "south"], [east, north, south])).toEqual([
    "north",
    "south",
    "east",
  ]);
});

test("nothing changes when no new value was picked", () => {
  expect(addFilterMultiSelectValue(["north"], [north])).toBeUndefined();
  expect(addFilterMultiSelectValue(["north"], [])).toBeUndefined();
  expect(addFilterMultiSelectValue(["north"], null)).toBeUndefined();
});
