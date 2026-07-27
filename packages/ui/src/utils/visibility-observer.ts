import type { Accessor } from "solid-js";
import { createRenderEffect, createSignal, onCleanup, untrack } from "solid-js";

type Falsy = false | null | undefined;
type VisibilitySetter = (
  entry: IntersectionObserverEntry,
  context: { visible: boolean },
) => boolean;

export type VisibilityObserverOptions = IntersectionObserverInit & {
  initialValue?: boolean;
};

export function createVisibilityObserver(
  options?: VisibilityObserverOptions,
  setter?: VisibilitySetter,
) {
  if (typeof IntersectionObserver === "undefined") {
    return () => () => false;
  }

  const callbacks = new WeakMap<Element, IntersectionObserverCallback>();
  const observer = new IntersectionObserver((entries, instance) => {
    for (const entry of entries) {
      callbacks.get(entry.target)?.([entry], instance);
    }
  }, options);

  onCleanup(() => observer.disconnect());

  return (element: Accessor<Element | Falsy> | Element): Accessor<boolean> => {
    const [visible, setVisible] = createSignal(options?.initialValue ?? false);
    let previous: Element | Falsy;

    const attach = (node: Element | Falsy) => {
      if (node === previous) return;
      if (previous) {
        observer.unobserve(previous);
        callbacks.delete(previous);
      }
      if (node) {
        callbacks.set(node, ([entry]) => {
          if (!entry) return;
          const next = setter ? setter(entry, { visible: untrack(visible) }) : entry.isIntersecting;
          setVisible(next);
        });
        observer.observe(node);
      }
      previous = node;
    };

    if (element instanceof Element) {
      attach(element);
    } else {
      createRenderEffect(element, (node) => {
        attach(node);
      });
    }

    onCleanup(() => attach(undefined));
    return visible;
  };
}
