import type { AnyExtension } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { PageBreak } from "./page-break.ts";

/**
 * Adds a `listType` attribute to ordered lists, rendered as
 * `data-list-type`. Consumers style `data-list-type="legal"` with CSS
 * counters for 1 / 1.1 / 1.1.1 clause numbering.
 */
const OrderedListType = Extension.create({
  name: "orderedListType",

  addGlobalAttributes() {
    return [
      {
        types: ["orderedList"],
        attributes: {
          listType: {
            default: null,
            parseHTML: (element: HTMLElement) => element.getAttribute("data-list-type"),
            renderHTML: (attributes: Record<string, unknown>) =>
              attributes.listType ? { "data-list-type": attributes.listType } : {},
          },
        },
      },
    ];
  },
});

/**
 * Extension bundle for A4 document editing: tables, explicit page breaks and
 * legal list numbering. Consumers pass this to `RichTextEditor`'s
 * `extensions` prop so app code never depends on @tiptap packages directly.
 */
export function documentEditorExtensions(): AnyExtension[] {
  return [
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    PageBreak,
    OrderedListType,
  ];
}
