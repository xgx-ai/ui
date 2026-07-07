import { mergeAttributes, Node } from "@tiptap/core";
import type { NodeView } from "@tiptap/pm/view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreak: {
      /** Insert an explicit page break at the current position. */
      setPageBreak: () => ReturnType;
    };
  }
}

/**
 * An explicit page break: an atom block that maps to `break-after: page` in
 * print CSS via its `data-type="page-break"` attribute.
 *
 * The NodeView renders two parts consumers can style to simulate physical
 * pages:
 * - `[data-role="page-break-spacer"]` — an empty block a host can size to
 *   fill the remainder of the current page.
 * - `[data-role="page-break-gap"]` — the visual divider (by default a dashed
 *   rule with a "Page break" label; hosts can restyle it as the gutter
 *   between two sheets).
 */
export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  parseHTML() {
    return [{ tag: 'div[data-type="page-break"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "page-break" })];
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ state, chain }) => {
          // A page break inside a table cell cannot start a new page; insert
          // it after the enclosing table instead.
          const { $from } = state.selection;
          for (let depth = $from.depth; depth > 0; depth--) {
            if ($from.node(depth).type.name === "table") {
              return chain()
                .insertContentAt($from.after(depth), [{ type: this.name }, { type: "paragraph" }])
                .run();
            }
          }

          return chain().insertContent({ type: this.name }).createParagraphNear().run();
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () => this.editor.commands.setPageBreak(),
    };
  },

  addNodeView() {
    return (): NodeView => {
      const dom = document.createElement("div");
      dom.setAttribute("data-type", "page-break");
      dom.contentEditable = "false";
      dom.className = "select-none";

      const spacer = document.createElement("div");
      spacer.setAttribute("data-role", "page-break-spacer");

      const gap = document.createElement("div");
      gap.setAttribute("data-role", "page-break-gap");
      gap.className = "my-4 flex items-center gap-2";

      const leftRule = document.createElement("span");
      leftRule.setAttribute("data-role", "page-break-rule");
      leftRule.className = "h-px flex-1 border-t border-dashed border-border";

      const label = document.createElement("span");
      label.setAttribute("data-role", "page-break-label");
      label.className =
        "rounded-full border border-border bg-muted px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground";
      label.textContent = "Page break";

      const rightRule = document.createElement("span");
      rightRule.setAttribute("data-role", "page-break-rule");
      rightRule.className = "h-px flex-1 border-t border-dashed border-border";

      gap.append(leftRule, label, rightRule);
      dom.append(spacer, gap);

      return { dom };
    };
  },
});
