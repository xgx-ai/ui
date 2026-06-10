export function assignRef<T>(ref: unknown, value: T) {
  if (typeof ref === "function") {
    ref(value);
    return;
  }

  if (ref && typeof ref === "object" && "current" in ref) {
    (ref as { current?: T }).current = value;
  }
}

export function containsNode(element: HTMLElement | undefined, target: Node) {
  return !!element && (element === target || element.contains(target));
}
