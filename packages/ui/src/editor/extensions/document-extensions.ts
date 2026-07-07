import type { AnyExtension } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import { PageBreak } from "./page-break.ts";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      /** Apply a CSS font-size value to the selected text. */
      setFontSize: (fontSize: string) => ReturnType;
      /** Remove the font-size value from the selected text. */
      unsetFontSize: () => ReturnType;
    };
  }
}

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
 * Tiptap does not publish an official font-size package at the pinned 3.20.x
 * version, so document editing stores size as a `textStyle` mark attribute.
 */
const FontSize = Extension.create({
  name: "fontSize",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize || null,
            renderHTML: (attributes: Record<string, unknown>) =>
              typeof attributes.fontSize === "string" && attributes.fontSize
                ? { style: `font-size: ${attributes.fontSize}` }
                : {},
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: null }).run(),
    };
  },
});

const LIST_MARKER_COLOR_PROPERTY = "--list-marker-color";

function firstTextColour(node: ProseMirrorNode): string | null {
  for (let index = 0; index < node.childCount; index += 1) {
    const child = node.child(index);
    if (child.type.name === "bulletList" || child.type.name === "orderedList") {
      continue;
    }

    if (child.isText) {
      const textStyleMark = child.marks.find(
        (mark) => mark.type.name === "textStyle" && typeof mark.attrs.color === "string",
      );

      if (typeof textStyleMark?.attrs.color === "string" && textStyleMark.attrs.color) {
        return textStyleMark.attrs.color;
      }
    }

    const nestedColour = firstTextColour(child);
    if (nestedColour) return nestedColour;
  }

  return null;
}

const ListItemMarkerColour = Extension.create({
  name: "listItemMarkerColour",

  addGlobalAttributes() {
    return [
      {
        types: ["listItem"],
        attributes: {
          markerColor: {
            default: null,
            parseHTML: (element: HTMLElement) =>
              element.style.getPropertyValue(LIST_MARKER_COLOR_PROPERTY).trim() || null,
            renderHTML: (attributes: Record<string, unknown>) =>
              typeof attributes.markerColor === "string" && attributes.markerColor
                ? {
                    style: `${LIST_MARKER_COLOR_PROPERTY}: ${attributes.markerColor}`,
                  }
                : {},
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((transaction) => transaction.docChanged)) {
            return null;
          }

          const listItemType = newState.schema.nodes.listItem;
          if (!listItemType) return null;

          let transaction = newState.tr;
          let changed = false;

          newState.doc.descendants((node, position) => {
            if (node.type !== listItemType) return true;

            const markerColor = firstTextColour(node);
            const currentMarkerColor =
              typeof node.attrs.markerColor === "string" ? node.attrs.markerColor : null;

            if (markerColor !== currentMarkerColor) {
              transaction = transaction.setNodeMarkup(position, undefined, {
                ...node.attrs,
                markerColor,
              });
              changed = true;
            }

            return false;
          });

          return changed ? transaction : null;
        },
      }),
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
    Image.configure({
      allowBase64: true,
      inline: false,
      resize: {
        enabled: true,
        directions: ["top-left", "top-right", "bottom-left", "bottom-right"],
        minWidth: 40,
        minHeight: 40,
        alwaysPreserveAspectRatio: true,
      },
    }),
    TextAlign.configure({
      types: ["heading", "paragraph", "tableCell", "tableHeader"],
    }),
    PageBreak,
    OrderedListType,
    FontSize,
    ListItemMarkerColour,
  ];
}
