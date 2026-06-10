import { getOwner, onCleanup } from "solid-js";

export function createMountEffect(effect: () => void | (() => void)): void {
  let disposed = false;
  let cleanup: void | (() => void);

  queueMicrotask(() => {
    if (disposed) return;
    cleanup = effect();
  });

  if (getOwner()) {
    onCleanup(() => {
      disposed = true;
      cleanup?.();
    });
  }
}
