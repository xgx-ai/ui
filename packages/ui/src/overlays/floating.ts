export function assignRef<T>(ref: unknown, value: T) {
  if (typeof ref === "function") {
    ref(value);
    return;
  }

  if (ref && typeof ref === "object" && "current" in ref) {
    (ref as { current?: T }).current = value;
  }
}

function isNode(value: unknown): value is Node {
  return (
    !!value &&
    typeof value === "object" &&
    ("nodeType" in value || (typeof Node === "function" && value instanceof Node))
  );
}

export function containsNode(element: HTMLElement | undefined, target: unknown) {
  return !!element && isNode(target) && (element === target || element.contains(target));
}
