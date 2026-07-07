import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageLayout: {
      /** Re-measure and re-paginate (call after resize or page-size changes). */
      relayoutPages: () => ReturnType;
    };
  }
}

export type PageGapGeometry = {
  kind: "explicit" | "auto";
  /** Top of the gap band, px relative to the editor top. */
  topPx: number;
  heightPx: number;
  /** Number of the page that starts below this gap. */
  page: number;
};

export type PageOverflowGeometry = {
  /** Page boundary crossing an unsplittable block, px relative to the editor top. */
  offsetPx: number;
  page: number;
};

export type PageLayoutResult = {
  totalPages: number;
  gaps: PageGapGeometry[];
  overflows: PageOverflowGeometry[];
  /** Rendered bottom of the last block, px relative to the editor top. */
  contentBottomPx: number;
  /** Blank space remaining on the final page. */
  lastPageRemainderPx: number;
};

export type PageLayoutOptions = {
  /** Content height of one page in px (page height minus vertical margins). */
  getPageHeightPx: () => number;
  onLayout?: (result: PageLayoutResult) => void;
};

/**
 * Physical pagination for a continuous document. Measures top-level blocks
 * and paginates exactly like an explicit `PageBreak`: when a block would
 * cross the bottom of the current page it is pushed to the next one by a
 * widget decoration with the same spacer + gap DOM (`data-type="page-break"`
 * with `data-auto="true"`), so automatic and manual breaks render
 * identically. Headings are kept with the block that follows them. Blocks
 * taller than a full page cannot be split; the boundaries crossing them are
 * reported via `onLayout` as overflows.
 */
export const PageLayout = Extension.create<PageLayoutOptions>({
  name: "pageLayout",

  addOptions() {
    return {
      getPageHeightPx: () => 0,
      onLayout: undefined,
    };
  },

  addCommands() {
    return {
      relayoutPages:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) dispatch(tr.setMeta(pageLayoutKey, { type: "relayout" }));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [createPageLayoutPlugin(this.options)];
  },
});

type BreakSpec = { pos: number; fillPx: number };

type PageLayoutState = {
  decorations: DecorationSet;
  specs: BreakSpec[];
  relayoutSeq: number;
};

type SpecsMeta = { type: "specs"; specs: BreakSpec[] };
type RelayoutMeta = { type: "relayout" };

const pageLayoutKey = new PluginKey<PageLayoutState>("pageLayout");

const EPS = 1;

function createPageLayoutPlugin(options: PageLayoutOptions): Plugin<PageLayoutState> {
  return new Plugin<PageLayoutState>({
    key: pageLayoutKey,
    state: {
      init: () => ({ decorations: DecorationSet.empty, specs: [], relayoutSeq: 0 }),
      apply(tr, value) {
        const meta = tr.getMeta(pageLayoutKey) as SpecsMeta | RelayoutMeta | undefined;
        if (meta?.type === "specs") {
          return {
            decorations: buildDecorations(tr.doc, meta.specs),
            specs: meta.specs,
            relayoutSeq: value.relayoutSeq,
          };
        }

        return {
          decorations: value.decorations.map(tr.mapping, tr.doc),
          specs: value.specs,
          relayoutSeq: meta?.type === "relayout" ? value.relayoutSeq + 1 : value.relayoutSeq,
        };
      },
    },
    props: {
      decorations(state) {
        return pageLayoutKey.getState(state)?.decorations;
      },
    },
    view(initialView) {
      let raf: number | undefined;
      let retries = 0;
      const schedule = (view: EditorView) => {
        if (raf !== undefined) return;
        raf = requestAnimationFrame(() => {
          raf = undefined;
          if (measure(view, options)) {
            retries = 0;
            return;
          }
          // Not measurable yet (editor DOM not connected, page height not
          // known, or decorations mid-flight) — retry until it settles.
          retries += 1;
          if (retries < 120) schedule(view);
        });
      };

      schedule(initialView);

      return {
        update(view, prevState) {
          const prev = pageLayoutKey.getState(prevState);
          const current = pageLayoutKey.getState(view.state);
          if (
            view.state.doc !== prevState.doc ||
            prev?.specs !== current?.specs ||
            prev?.relayoutSeq !== current?.relayoutSeq
          ) {
            schedule(view);
          }
        },
        destroy() {
          if (raf !== undefined) cancelAnimationFrame(raf);
        },
      };
    },
  });
}

function buildDecorations(doc: PMNode, specs: BreakSpec[]): DecorationSet {
  return DecorationSet.create(
    doc,
    specs.map((spec) =>
      Decoration.widget(spec.pos, () => buildAutoBreakDom(spec.fillPx), {
        key: `page-break-${spec.pos}-${Math.round(spec.fillPx)}`,
        side: -1,
        ignoreSelection: true,
      }),
    ),
  );
}

function buildAutoBreakDom(fillPx: number): HTMLElement {
  const dom = document.createElement("div");
  dom.setAttribute("data-type", "page-break");
  dom.setAttribute("data-auto", "true");
  dom.contentEditable = "false";

  const spacer = document.createElement("div");
  spacer.setAttribute("data-role", "page-break-spacer");
  spacer.style.height = `${Math.round(fillPx)}px`;

  const gap = document.createElement("div");
  gap.setAttribute("data-role", "page-break-gap");

  dom.append(spacer, gap);
  return dom;
}

type MeasuredBlock = {
  pos: number;
  el: HTMLElement;
  /** Height in the natural (unpaginated) flow; explicit breaks count as 0. */
  height: number;
  /** Top in the natural flow: rendered top minus injected fill/gap heights. */
  naturalTop: number;
  isBreak: boolean;
  isHeading: boolean;
};

type SimEvent =
  | { kind: "explicit"; el: HTMLElement }
  | { kind: "auto"; pos: number }
  | {
      kind: "overflow";
      blockEl: HTMLElement;
      blockNaturalTop: number;
      naturalOffset: number;
    };

/** Returns false when layout could not be measured yet and should be retried. */
function measure(view: EditorView, options: PageLayoutOptions): boolean {
  if (view.isDestroyed) return true;

  const pageH = options.getPageHeightPx();
  const pm = view.dom;
  if (!pm.isConnected || pageH <= 0) return false;

  const pmTop = pm.getBoundingClientRect().top;

  // Everything already injected for pagination (explicit break nodes and auto
  // widgets). Subtracting their heights recovers the natural, unpaginated
  // flow, which stays stable while decorations change — that is what makes
  // the layout pass idempotent.
  const injected = Array.from(
    pm.querySelectorAll<HTMLElement>(':scope > [data-type="page-break"]'),
  ).map((el) => {
    const rect = el.getBoundingClientRect();
    return { el, top: rect.top - pmTop, height: rect.height };
  });

  const blocks: MeasuredBlock[] = [];
  view.state.doc.forEach((node, offset) => {
    const el = view.nodeDOM(offset);
    if (!(el instanceof HTMLElement)) return;

    const rect = el.getBoundingClientRect();
    const renderedTop = rect.top - pmTop;
    const isBreak = node.type.name === "pageBreak";
    const injectedAbove = injected.reduce(
      (sum, item) => (item.el !== el && item.top < renderedTop - 0.5 ? sum + item.height : sum),
      0,
    );

    blocks.push({
      pos: offset,
      el,
      height: isBreak ? 0 : rect.height,
      naturalTop: renderedTop - injectedAbove,
      isBreak,
      isHeading: node.type.name === "heading",
    });
  });

  // Simulate the page flow over natural positions.
  const specs: BreakSpec[] = [];
  const events: SimEvent[] = [];
  const explicitFills: Array<{ el: HTMLElement; fillPx: number }> = [];
  let pageStart = 0;
  let index = 0;

  while (index < blocks.length) {
    const block = blocks[index];

    if (block.isBreak) {
      explicitFills.push({
        el: block.el,
        fillPx: Math.max(0, pageStart + pageH - block.naturalTop),
      });
      events.push({ kind: "explicit", el: block.el });
      pageStart = block.naturalTop;
      index += 1;
      continue;
    }

    const bottom = block.naturalTop + block.height;
    if (bottom > pageStart + pageH + EPS) {
      const atPageTop = block.naturalTop <= pageStart + EPS;

      if (!atPageTop && block.height <= pageH + EPS) {
        // Push the block to the next page, keeping headings with what follows.
        let target = index;
        while (
          target > 0 &&
          blocks[target - 1].isHeading &&
          blocks[target - 1].naturalTop > pageStart + EPS
        ) {
          target -= 1;
        }

        const first = blocks[target];
        specs.push({
          pos: first.pos,
          fillPx: Math.max(0, pageStart + pageH - first.naturalTop),
        });
        events.push({ kind: "auto", pos: first.pos });
        pageStart = first.naturalTop;
        index = target + 1;
        continue;
      }

      // Unsplittable block taller than the remaining page(s): the page
      // boundaries cross it, so report them instead of breaking.
      let boundary = pageStart + pageH;
      while (boundary < bottom - EPS) {
        events.push({
          kind: "overflow",
          blockEl: block.el,
          blockNaturalTop: block.naturalTop,
          naturalOffset: boundary,
        });
        pageStart = boundary;
        boundary += pageH;
      }
    }

    index += 1;
  }

  const lastBlock = blocks.at(-1);
  const contentNaturalBottom = lastBlock ? lastBlock.naturalTop + lastBlock.height : 0;
  const lastPageRemainderPx = Math.max(0, pageStart + pageH - contentNaturalBottom);

  // Explicit break fills are plain DOM writes on the NodeView, no transaction.
  for (const { el, fillPx } of explicitFills) {
    const spacer = el.querySelector<HTMLElement>('[data-role="page-break-spacer"]');
    if (spacer) spacer.style.height = `${Math.round(fillPx)}px`;
  }

  const previousSpecs = pageLayoutKey.getState(view.state)?.specs ?? [];
  if (!specsEqual(previousSpecs, specs)) {
    // Apply the new pagination; the state change schedules the next pass,
    // which will find identical specs and emit geometry.
    view.dispatch(view.state.tr.setMeta(pageLayoutKey, { type: "specs", specs }));
    return true;
  }

  return emitGeometry(view, events, contentNaturalBottom, lastPageRemainderPx, options);
}

function specsEqual(a: BreakSpec[], b: BreakSpec[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (spec, index) => spec.pos === b[index].pos && Math.abs(spec.fillPx - b[index].fillPx) < 1,
  );
}

function emitGeometry(
  view: EditorView,
  events: SimEvent[],
  contentNaturalBottom: number,
  lastPageRemainderPx: number,
  options: PageLayoutOptions,
): boolean {
  if (!options.onLayout) return true;

  const pm = view.dom;
  const pmTop = pm.getBoundingClientRect().top;
  const breakEls = Array.from(
    pm.querySelectorAll<HTMLElement>(':scope > [data-type="page-break"]'),
  );
  const gapEvents = events.filter((event) => event.kind !== "overflow");
  if (breakEls.length !== gapEvents.length) return false; // transient; retry

  type Marker =
    | { sort: number; gap: Omit<PageGapGeometry, "page"> }
    | { sort: number; overflow: Omit<PageOverflowGeometry, "page"> };

  const markers: Marker[] = breakEls.map((el) => {
    const gapEl = el.querySelector<HTMLElement>('[data-role="page-break-gap"]') ?? el;
    const rect = gapEl.getBoundingClientRect();
    const topPx = rect.top - pmTop;
    return {
      sort: topPx,
      gap: {
        kind: el.hasAttribute("data-auto") ? "auto" : "explicit",
        topPx,
        heightPx: rect.height,
      },
    };
  });

  for (const event of events) {
    if (event.kind !== "overflow") continue;
    const blockTop = event.blockEl.getBoundingClientRect().top - pmTop;
    const offsetPx = blockTop + (event.naturalOffset - event.blockNaturalTop);
    markers.push({ sort: offsetPx, overflow: { offsetPx } });
  }

  markers.sort((a, b) => a.sort - b.sort);

  const gaps: PageGapGeometry[] = [];
  const overflows: PageOverflowGeometry[] = [];
  markers.forEach((marker, index) => {
    const page = index + 2;
    if ("gap" in marker) gaps.push({ ...marker.gap, page });
    else overflows.push({ ...marker.overflow, page });
  });

  const lastEl = pm.lastElementChild;
  const contentBottomPx = lastEl
    ? lastEl.getBoundingClientRect().bottom - pmTop
    : contentNaturalBottom;

  options.onLayout({
    totalPages: markers.length + 1,
    gaps,
    overflows,
    contentBottomPx,
    lastPageRemainderPx,
  });

  return true;
}
