import { Extension } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

export type ParameterSuggestionItem = {
  key: string;
  label: string;
  description?: string;
};

export type ParameterSuggestionOptions = {
  items: () => ParameterSuggestionItem[];
  maxItems?: number;
};

type SuggestionMatch = {
  from: number;
  to: number;
  query: string;
};

type ActiveSuggestion = {
  items: ParameterSuggestionItem[];
  match: SuggestionMatch;
  selectedIndex: number;
};

const parameterSuggestionKey = new PluginKey("parameterSuggestion");
const trigger = "{{";
const queryPattern = /^[A-Za-z0-9_.-]*$/;

export const ParameterSuggestion = Extension.create<ParameterSuggestionOptions>({
  name: "parameterSuggestion",

  addOptions() {
    return {
      items: () => [],
      maxItems: 8,
    };
  },

  addProseMirrorPlugins() {
    return [createParameterSuggestionPlugin(this.options)];
  },
});

function createParameterSuggestionPlugin(options: ParameterSuggestionOptions) {
  let controller: ParameterSuggestionController | null = null;

  return new Plugin({
    key: parameterSuggestionKey,
    props: {
      handleKeyDown(_view, event) {
        return controller?.handleKeyDown(event) ?? false;
      },
    },
    view(view) {
      controller = new ParameterSuggestionController(view, options);
      controller.update(view);

      return {
        update(nextView) {
          controller?.update(nextView);
        },
        destroy() {
          controller?.destroy();
          controller = null;
        },
      };
    },
  });
}

class ParameterSuggestionController {
  private active: ActiveSuggestion | null = null;
  private popup: HTMLDivElement | null = null;
  private view: EditorView;

  constructor(
    view: EditorView,
    private options: ParameterSuggestionOptions,
  ) {
    this.view = view;
  }

  update(view: EditorView) {
    this.view = view;

    if (!view.editable || view.isDestroyed) {
      this.close();
      return;
    }

    const match = findSuggestionMatch(view.state);
    if (!match) {
      this.close();
      return;
    }

    const items = filterItems(this.options.items(), match.query, this.options.maxItems ?? 8);
    const selectedIndex =
      this.active &&
      this.active.match.from === match.from &&
      this.active.match.to === match.to &&
      this.active.items.length === items.length
        ? Math.min(this.active.selectedIndex, Math.max(0, items.length - 1))
        : 0;

    this.active = { items, match, selectedIndex };
    this.render();
  }

  handleKeyDown(event: KeyboardEvent): boolean {
    if (!this.active) return false;

    if (event.key === "Escape") {
      event.preventDefault();
      this.close();
      return true;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.moveSelection(1);
      return true;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.moveSelection(-1);
      return true;
    }

    if (event.key === "Enter" || event.key === "Tab") {
      if (this.active.items.length === 0) return false;
      event.preventDefault();
      this.select(this.active.selectedIndex);
      return true;
    }

    return false;
  }

  destroy() {
    this.close();
  }

  private moveSelection(delta: 1 | -1) {
    if (!this.active || this.active.items.length === 0) return;

    const itemCount = this.active.items.length;
    this.active = {
      ...this.active,
      selectedIndex: (this.active.selectedIndex + delta + itemCount) % itemCount,
    };
    this.render();
  }

  private select(index: number) {
    if (!this.active) return;

    const item = this.active.items[index];
    const parameterType = this.view.state.schema.nodes.parameter;
    if (!item || !parameterType) {
      this.close();
      return;
    }

    const parameterNode = parameterType.create({ paramName: item.key });
    const { from, to } = this.active.match;
    let tr = this.view.state.tr.replaceWith(from, to, parameterNode);
    tr = tr.setSelection(TextSelection.create(tr.doc, from + parameterNode.nodeSize));
    tr = tr.scrollIntoView();

    this.view.dispatch(tr);
    this.view.focus();
    this.close();
  }

  private render() {
    if (!this.active) return;

    const popup = this.ensurePopup();
    popup.replaceChildren();

    const list = document.createElement("div");
    list.setAttribute("role", "listbox");
    list.className = "space-y-0.5";

    if (this.active.items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "px-3 py-2 text-xs text-muted-foreground";
      empty.textContent = "No merge tags found";
      list.append(empty);
    }

    this.active.items.forEach((item, index) => {
      const selected = index === this.active?.selectedIndex;
      const option = document.createElement("button");
      option.type = "button";
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", selected ? "true" : "false");
      option.className = [
        "flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-xs outline-hidden transition-colors",
        selected ? "bg-accent text-accent-foreground" : "text-popover-foreground hover:bg-accent",
      ].join(" ");

      const textWrap = document.createElement("span");
      textWrap.className = "min-w-0";

      const label = document.createElement("span");
      label.className = "block truncate font-medium";
      label.textContent = item.label;

      const key = document.createElement("span");
      key.className = "block truncate text-[11px] text-muted-foreground";
      key.textContent = `{{${item.key}}}`;

      textWrap.append(label, key);
      option.append(textWrap);
      option.addEventListener("mousedown", (event) => {
        event.preventDefault();
      });
      option.addEventListener("click", () => {
        this.select(index);
      });
      list.append(option);
    });

    popup.append(list);
    this.positionPopup(popup);
  }

  private ensurePopup(): HTMLDivElement {
    if (this.popup) return this.popup;

    const popup = document.createElement("div");
    popup.className =
      "fixed z-50 max-h-72 w-80 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl";
    popup.setAttribute("data-type", "parameter-suggestion");
    document.body.append(popup);
    this.popup = popup;
    return popup;
  }

  private positionPopup(popup: HTMLDivElement) {
    if (!this.active) return;

    const coords = this.view.coordsAtPos(this.active.match.from);
    const width = 320;
    const left = Math.max(8, Math.min(coords.left, window.innerWidth - width - 8));
    const top = Math.max(8, Math.min(coords.bottom + 8, window.innerHeight - 96));

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  }

  private close() {
    this.active = null;
    this.popup?.remove();
    this.popup = null;
  }
}

function findSuggestionMatch(state: EditorState): SuggestionMatch | null {
  const { selection } = state;
  if (!selection.empty) return null;

  const { $from } = selection;
  const textBeforeCursor = $from.parent.textBetween(0, $from.parentOffset, "\n", "\0");
  const triggerIndex = textBeforeCursor.lastIndexOf(trigger);
  if (triggerIndex === -1) return null;

  const query = textBeforeCursor.slice(triggerIndex + trigger.length);
  if (!queryPattern.test(query)) return null;

  return {
    from: $from.start() + triggerIndex,
    to: $from.pos,
    query,
  };
}

function filterItems(
  items: ParameterSuggestionItem[],
  query: string,
  limit: number,
): ParameterSuggestionItem[] {
  const normalisedQuery = query.trim().toLowerCase();
  const filtered = normalisedQuery
    ? items.filter((item) =>
        [item.key, item.label, item.description ?? ""].some((value) =>
          value.toLowerCase().includes(normalisedQuery),
        ),
      )
    : items;

  return filtered.slice(0, Math.max(1, limit));
}
