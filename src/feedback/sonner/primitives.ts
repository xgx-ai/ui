import { createMountEffect } from "../../utils/lifecycle";
import { createSignal } from "solid-js";

export function useIsDocumentHidden() {
  const [isDocumentHidden, setIsDocumentHidden] = createSignal(false);

  createMountEffect(() => {
    const callback = () => {
      setIsDocumentHidden(document.hidden);
    };
    document.addEventListener("visibilitychange", callback);

    return () => {
      document.removeEventListener("visibilitychange", callback);
    };
  });

  return isDocumentHidden;
}
