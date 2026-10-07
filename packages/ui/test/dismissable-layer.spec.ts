import { createRoot, createSignal, flush } from "solid-js";
import { createDismissableLayer, type DismissableLayer } from "../src/overlays/dismissable-layer";

// Bookkeeping checks for the layer helper. The real DOM behaviour (portals, delegated events,
// focus) is covered by tests/nested-layers.spec.ts in the browser.

class TestElement {
  readonly nodeType = 1;
  constructor(
    readonly name: string,
    public parent?: TestElement,
  ) {}
  contains(target: TestElement) {
    for (let node: TestElement | undefined = target; node; node = node.parent) {
      if (node === this) return true;
    }
    return false;
  }
}

type Listener = { capture: boolean; listener: (event: any) => void };

class TestDocument {
  readonly listeners = new Map<string, Listener[]>();
  addEventListener(type: string, listener: (event: any) => void, capture = false) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push({ capture: Boolean(capture), listener });
    this.listeners.set(type, listeners);
  }
  removeEventListener(type: string, listener: (event: any) => void, capture = false) {
    const listeners = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      listeners.filter(
        (entry) => entry.listener !== listener || entry.capture !== Boolean(capture),
      ),
    );
  }
  dispatch(type: string, event: any) {
    const listeners = this.listeners.get(type) ?? [];
    for (const phase of [true, false]) {
      for (const entry of [...listeners]) if (entry.capture === phase) entry.listener(event);
    }
    return event;
  }
  pointer(target: TestElement, path: TestElement[]) {
    this.dispatch("pointerdown", { target, composedPath: () => path });
  }
  escape(handled = false) {
    const event = {
      key: "Escape",
      defaultPrevented: handled,
      preventDefault() {
        event.defaultPrevented = true;
      },
    };
    return this.dispatch("keydown", event);
  }
  get count() {
    return [...this.listeners.values()].reduce((count, listeners) => count + listeners.length, 0);
  }
}

function equal(actual: unknown, expected: unknown, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
  }
}

function mountLayer(
  root: TestElement,
  content: TestElement,
  parent: DismissableLayer | null,
  options: { escapeCapture?: boolean } = {},
) {
  const closes: string[] = [];
  return createRoot((dispose) => {
    const [open, setOpen] = createSignal(true);
    const [contentRef, setContentRef] = createSignal(content);
    const layer = createDismissableLayer({
      open,
      elements: () => [root, contentRef()] as unknown as HTMLElement[],
      onPointerDownOutside: () => closes.push("pointer"),
      onEscapeKeyDown: () => closes.push("escape"),
      escapeCapture: options.escapeCapture,
      parent,
    });
    return { closes, dispose, layer, setContentRef, setOpen };
  });
}

export default function runDismissableLayerSpec() {
  const previousDocument = globalThis.document;
  const previousWarn = console.warn;
  const diagnostics: string[] = [];
  console.warn = (...args) => {
    const message = args.map(String).join(" ");
    if (
      /STRICT_READ|WRITE_UNDER|OWNED_SCOPE|PRIMITIVE_IN_FORBIDDEN_SCOPE|REACTIVITY_HALTED/i.test(
        message,
      )
    ) {
      diagnostics.push(message);
    }
    previousWarn(...args);
  };
  const document = new TestDocument();
  globalThis.document = document as unknown as Document;
  const body = new TestElement("body");
  const outerRoot = new TestElement("outer trigger", body);
  const outerContent = new TestElement("outer portal", body);
  const nestedRoot = new TestElement("nested trigger", outerContent);
  const nestedContent = new TestElement("nested portal", body);
  const choice = new TestElement("staff choice", nestedContent);
  const outer = mountLayer(outerRoot, outerContent, null);
  const child = mountLayer(nestedRoot, nestedContent, outer.layer);
  const disposes = [outer.dispose, child.dispose];
  try {
    flush();
    document.pointer(choice, [choice, nestedContent, body]);
    equal(outer.closes, [], "a nested portalled choice keeps its parent open");
    equal(child.closes, [], "the chosen child stays open until its own handler closes it");
    equal(outer.layer.contains(choice), true, "the parent contains open descendant content");

    const grandchildContent = new TestElement("grandchild portal", body);
    const grandchild = mountLayer(
      new TestElement("grandchild trigger", nestedContent),
      grandchildContent,
      child.layer,
    );
    disposes.push(grandchild.dispose);
    flush();
    const grandchildChoice = new TestElement("grandchild choice", grandchildContent);
    document.pointer(grandchildChoice, [grandchildChoice, grandchildContent, body]);
    equal(outer.closes, [], "grandchild portal membership reaches all ancestors");
    equal(child.closes, [], "grandchild portal membership reaches its immediate parent");

    // Escape reaches only the innermost open layer, one layer per key press.
    document.escape();
    equal(grandchild.closes, ["escape"], "Escape closes the innermost layer");
    equal(child.closes, [], "Escape leaves the middle layer open");
    equal(outer.closes, [], "Escape leaves the outer layer open");
    equal(document.escape(true).defaultPrevented, true, "a handled Escape stays handled");
    equal(grandchild.closes, ["escape"], "an already handled Escape is ignored");

    // Native options may remove the target before the document bubble listener runs.
    choice.parent = undefined;
    document.pointer(choice, [choice, nestedContent, body]);
    equal(outer.closes, [], "the original dispatch path protects a detached child option");
    equal(child.closes, [], "the original dispatch path protects its own detached option");
    grandchild.dispose();
    flush();
    document.pointer(grandchildChoice, [grandchildChoice, grandchildContent, body]);
    equal(outer.closes, ["pointer"], "disposed descendant content no longer protects ancestors");
    equal(child.closes, ["pointer"], "disposed descendant content no longer protects its parent");
    document.escape();
    equal(
      child.closes,
      ["pointer", "escape"],
      "a released descendant returns Escape to its parent",
    );
    equal(outer.closes, ["pointer"], "the outer layer still waits for its open child");

    const replacement = new TestElement("replacement child portal", body);
    child.setContentRef(replacement);
    flush();
    document.pointer(nestedContent, [nestedContent, body]);
    equal(outer.closes.length, 2, "replaced child content is unregistered");
    const replacementChoice = new TestElement("replacement choice", replacement);
    document.pointer(replacementChoice, [replacementChoice, replacement, body]);
    equal(outer.closes.length, 2, "replacement child content is registered");
    child.setOpen(false);
    flush();
    document.pointer(replacementChoice, [replacementChoice, replacement, body]);
    equal(outer.closes.length, 3, "closed child content is unregistered");
    document.escape();
    equal(outer.closes.at(-1), "escape", "a closed child returns Escape to its parent");
    child.setOpen(true);
    flush();
    document.pointer(replacementChoice, [replacementChoice, replacement, body]);
    equal(outer.closes.length, 4, "reopened child content is registered again");

    const siblingContent = new TestElement("sibling portal", body);
    const sibling = mountLayer(
      new TestElement("sibling trigger", outerContent),
      siblingContent,
      outer.layer,
    );
    disposes.push(sibling.dispose);
    flush();
    const childCloseCount = child.closes.length;
    document.pointer(siblingContent, [siblingContent, body]);
    equal(outer.closes.length, 4, "a sibling portal still belongs to the common parent");
    equal(child.closes.length, childCloseCount + 1, "a sibling portal dismisses the other child");
    equal(sibling.closes, [], "the active sibling recognises its own content");
    document.pointer(outerContent, [outerContent, body]);
    equal(outer.closes.length, 4, "clicking the outer content leaves the outer panel open");
    equal(sibling.closes, ["pointer"], "clicking outside a child dismisses that child");
    document.pointer(body, [body]);
    equal(outer.closes.length, 5, "an unrelated outside click still dismisses the parent");

    child.dispose();
    flush();
    document.pointer(replacementChoice, [replacementChoice, replacement, body]);
    equal(outer.closes.length, 6, "unmounted child content is unregistered");
    sibling.dispose();
    outer.dispose();
    flush();

    // A modal surface captures Escape, but still waits for an open layer inside it.
    const modalContent = new TestElement("modal content", body);
    const modal = mountLayer(modalContent, modalContent, null, { escapeCapture: true });
    disposes.push(modal.dispose);
    const insideModal = mountLayer(
      new TestElement("modal menu trigger", modalContent),
      new TestElement("modal menu", body),
      modal.layer,
    );
    disposes.push(insideModal.dispose);
    flush();
    document.escape();
    equal(modal.closes, [], "a modal waits for the open layer inside it");
    equal(insideModal.closes, ["escape"], "the layer inside the modal closes first");
    insideModal.setOpen(false);
    flush();
    document.escape(true);
    equal(modal.closes, ["escape"], "a modal closes even when content handled Escape");
  } finally {
    for (const dispose of disposes.toReversed()) dispose();
    globalThis.document = previousDocument;
    console.warn = previousWarn;
  }
  equal(document.count, 0, "all document listeners are removed on owner disposal");
  equal(diagnostics, [], "nested dismissal emits no native ownership diagnostics");
  console.log("ok - dismissable layer: nested portal ownership, Escape order and cleanup");
}

if (import.meta.main) runDismissableLayerSpec();
