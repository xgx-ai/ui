import { createRoot } from "solid-js";
import { HoverCardTrigger } from "../src/data-display/hover-card";
import { useDndContext } from "../src/dnd/core/context";
import { useKanbanContext } from "../src/dnd/kanban/kanban-context";
import { useSortableContext } from "../src/dnd/sortable/sortable-context";
import { useSortableItem } from "../src/dnd/sortablejs/context";
import { useTreeDndContext } from "../src/dnd/tree/tree-context";
import { TooltipTrigger } from "../src/feedback/tooltip";
import { useFormAttributesProvider } from "../src/forms/form-attribute-context";
import { NumberFieldLabel } from "../src/forms/number-field";
import { useSearchItemContext } from "../src/forms/search";
import { SelectTrigger } from "../src/forms/select";
import { SliderFill } from "../src/forms/slider";
import { ContextMenuTrigger } from "../src/navigation/context-menu";
import { DropdownMenuTrigger } from "../src/navigation/dropdown-menu";
import { MenubarTrigger } from "../src/navigation/menubar";
import { NavigationMenuTrigger } from "../src/navigation/navigation-menu";
import { SheetTrigger } from "../src/overlays/sheet";

// Solid 2 throws a generic ContextNotFoundError (empty in production) for a context created
// without a default. Library contexts default to null, so a part outside its root reports the
// library's own message, and optional consumers read null instead of throwing.

const requiredParts: [string, () => unknown, string][] = [
  [
    "ContextMenuTrigger",
    () => ContextMenuTrigger({}),
    "ContextMenu parts must be used inside ContextMenu.",
  ],
  [
    "DropdownMenuTrigger",
    () => DropdownMenuTrigger({}),
    "DropdownMenu parts must be used inside DropdownMenu.",
  ],
  [
    "HoverCardTrigger",
    () => HoverCardTrigger({}),
    "HoverCard parts must be used inside HoverCard.",
  ],
  [
    "MenubarTrigger",
    () => MenubarTrigger({}),
    "Menubar menu parts must be used inside MenubarMenu.",
  ],
  [
    "NavigationMenuTrigger",
    () => NavigationMenuTrigger({}),
    "NavigationMenu item parts must be used inside NavigationMenuItem.",
  ],
  [
    "NumberFieldLabel",
    () => NumberFieldLabel({}),
    "Number field parts must be used inside NumberField.",
  ],
  ["SelectTrigger", () => SelectTrigger({}), "Search parts must be used inside Search."],
  ["SheetTrigger", () => SheetTrigger({}), "Sheet parts must be used inside Sheet."],
  ["SliderFill", () => SliderFill({}), "Slider parts must be used inside Slider."],
  ["TooltipTrigger", () => TooltipTrigger({}), "Tooltip parts must be used inside Tooltip."],
  ["useDndContext", useDndContext, "useDndContext must be used within a DndProvider"],
  ["useKanbanContext", useKanbanContext, "useKanbanContext must be used within a KanbanProvider"],
  [
    "useSortableContext",
    useSortableContext,
    "useSortableContext must be used within a SortableProvider",
  ],
  [
    "useSortableItem",
    useSortableItem,
    "useSortableItem must be used within a Sortable item render function",
  ],
  [
    "useTreeDndContext",
    useTreeDndContext,
    "useTreeDndContext must be used within a TreeDndProvider",
  ],
];

export default function runContextDefaultsSpec() {
  for (const [name, render, message] of requiredParts) {
    let error: unknown;
    createRoot((dispose) => {
      try {
        render();
      } catch (cause) {
        error = cause;
      } finally {
        dispose();
      }
    });
    if (!(error instanceof Error) || error.message !== message) {
      throw new Error(`${name} outside its root must report "${message}", got ${String(error)}`);
    }
  }

  createRoot((dispose) => {
    try {
      if (useSearchItemContext() !== undefined) {
        throw new Error("useSearchItemContext outside an item must return undefined");
      }
      if (useFormAttributesProvider() !== null) {
        throw new Error("useFormAttributesProvider without a provider must return null");
      }
    } finally {
      dispose();
    }
  });
  console.log("ok - contexts: required parts report library errors; optional reads return empty");
}

if (import.meta.main) runContextDefaultsSpec();
