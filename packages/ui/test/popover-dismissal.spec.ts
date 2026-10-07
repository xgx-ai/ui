import { createRoot, createSignal, flush } from "solid-js";
import { createPopoverDismissal, type PopoverDismissal } from "../src/overlays/popover-dismissal";

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

class TestDocument {
  readonly listeners = new Map<string, Set<(event: any) => void>>();
  addEventListener(type: string, listener: (event: any) => void) {
    let listeners = this.listeners.get(type);
    if (!listeners) this.listeners.set(type, (listeners = new Set()));
    listeners.add(listener);
  }
  removeEventListener(type: string, listener: (event: any) => void) {
    this.listeners.get(type)?.delete(listener);
  }
  pointer(target: TestElement, path: TestElement[]) {
    for (const listener of this.listeners.get("pointerdown") ?? []) {
      listener({ target, composedPath: () => path });
    }
  }
  escape() {
    for (const listener of this.listeners.get("keydown") ?? []) listener({ key: "Escape" });
  }
  get count() {
    return [...this.listeners.values()].reduce((count, listeners) => count + listeners.size, 0);
  }
}

function equal(actual: unknown, expected: unknown, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
  }
}

function mountPopover(root: TestElement, content: TestElement, parent?: PopoverDismissal) {
  const closes: boolean[] = [];
  return createRoot((dispose) => {
    const [open, setOpen] = createSignal(true);
    const [contentRef, setContentRef] = createSignal(content);
    const dismissal = createPopoverDismissal({
      close: () => closes.push(false),
      contentRef: () => contentRef() as unknown as HTMLElement,
      open,
      parent,
      rootRef: () => root as unknown as HTMLElement,
    });
    return { closes, dismissal, dispose, setContentRef, setOpen };
  });
}

export default function runPopoverDismissalSpec() {
  const previousDocument = globalThis.document;
  const previousWarn = console.warn;
  const diagnostics: string[] = [];
  console.warn = (...args) => {
    const message = args.map(String).join(" ");
    if (/STRICT_READ|WRITE_UNDER|PRIMITIVE_IN_FORBIDDEN_SCOPE|REACTIVITY_HALTED/i.test(message)) {
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
  const outer = mountPopover(outerRoot, outerContent);
  const child = mountPopover(nestedRoot, nestedContent, outer.dismissal);
  const disposes = [outer.dispose, child.dispose];
  try {
    flush();
    document.pointer(choice, [choice, nestedContent, body]);
    equal(outer.closes, [], "a nested portalled choice keeps its parent open");
    equal(child.closes, [], "the chosen child stays open until its own handler closes it");

    const grandchildContent = new TestElement("grandchild portal", body);
    const grandchild = mountPopover(
      new TestElement("grandchild trigger", nestedContent),
      grandchildContent,
      child.dismissal,
    );
    disposes.push(grandchild.dispose);
    flush();
    const grandchildChoice = new TestElement("grandchild choice", grandchildContent);
    document.pointer(grandchildChoice, [grandchildChoice, grandchildContent, body]);
    equal(outer.closes, [], "grandchild portal membership reaches all ancestors");
    equal(child.closes, [], "grandchild portal membership reaches its immediate parent");

    // Native options may remove the target before the document bubble listener runs.
    choice.parent = undefined;
    document.pointer(choice, [choice, nestedContent, body]);
    equal(outer.closes, [], "the original dispatch path protects a detached child option");
    equal(child.closes, [], "the original dispatch path protects its own detached option");
    grandchild.dispose();
    document.pointer(grandchildChoice, [grandchildChoice, grandchildContent, body]);
    equal(outer.closes.length, 1, "disposed descendant content no longer protects ancestors");
    equal(child.closes.length, 1, "disposed descendant content no longer protects its parent");

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
    child.setOpen(true);
    flush();
    document.pointer(replacementChoice, [replacementChoice, replacement, body]);
    equal(outer.closes.length, 3, "reopened child content is registered again");

    const siblingContent = new TestElement("sibling portal", body);
    const sibling = mountPopover(
      new TestElement("sibling trigger", outerContent),
      siblingContent,
      outer.dismissal,
    );
    disposes.push(sibling.dispose);
    flush();
    const childCloseCount = child.closes.length;
    document.pointer(siblingContent, [siblingContent, body]);
    equal(outer.closes.length, 3, "a sibling portal still belongs to the common parent");
    equal(child.closes.length, childCloseCount + 1, "a sibling portal dismisses the other child");
    equal(sibling.closes, [], "the active sibling recognises its own content");
    document.pointer(outerContent, [outerContent, body]);
    equal(outer.closes.length, 3, "clicking the outer content leaves the outer panel open");
    equal(sibling.closes.length, 1, "clicking outside a child dismisses that child");
    document.pointer(body, [body]);
    equal(outer.closes.length, 4, "an unrelated outside click still dismisses the parent");
    document.escape();
    equal(outer.closes.length, 5, "Escape retains existing dismissal behaviour");
    child.dispose();
    document.pointer(replacementChoice, [replacementChoice, replacement, body]);
    equal(outer.closes.length, 6, "unmounted child content is unregistered");
  } finally {
    for (const dispose of disposes.toReversed()) dispose();
    globalThis.document = previousDocument;
    console.warn = previousWarn;
  }
  equal(document.count, 0, "all document listeners are removed on owner disposal");
  equal(diagnostics, [], "nested dismissal emits no native ownership diagnostics");
  console.log("ok - popover: nested portal ownership and dismissal cleanup");
}

if (import.meta.main) runPopoverDismissalSpec();
