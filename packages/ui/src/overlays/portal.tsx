import type { JSX } from "@solidjs/web";
import { insert, registerDelegatedContainer, unregisterDelegatedContainer } from "@solidjs/web";
import { createEffect, createMemo, createRenderEffect, Show } from "solid-js";

type PortalMountProps = {
  children?: JSX.Element;
  disabled?: boolean;
  mount?: Element;
};

const defaultMount = () => (typeof document === "undefined" ? undefined : document.body);

const PortalMount = (props: PortalMountProps) => {
  if (typeof document === "undefined") return <>{props.children}</>;

  const marker = document.createTextNode("");
  const startMarker = document.createTextNode("");
  const endMarker = document.createTextNode("");
  const mount = () => props.mount ?? defaultMount();
  const activeTarget = () => (props.disabled ? undefined : mount());

  // Claim this portal's place in the target before its children render. A portal nested in
  // this one (a menu inside a popover) renders first, so without the claim its region would
  // come earlier in the target and its floating content would stack beneath this one's (S17).
  createRenderEffect(activeTarget, (target) => {
    if (target && !endMarker.parentNode) target.appendChild(endMarker);
  });

  const content = createMemo(() => [startMarker, props.children]);

  createEffect(activeTarget, (target) => {
    if (!target) return;

    registerDelegatedContainer(target);
    return () => unregisterDelegatedContainer(target);
  });

  createRenderEffect(
    () => ({
      content: content(),
      target: activeTarget(),
    }),
    (state) => {
      if (!state.target) return;

      const target = state.target;
      if (endMarker.parentNode !== target) target.appendChild(endMarker);
      insert(target, state.content, endMarker);

      return () => {
        let node: ChildNode | null = startMarker;
        while (node?.parentNode === target) {
          const next: ChildNode | null = node.nextSibling;
          target.removeChild(node);
          if (node === endMarker) break;
          node = next;
        }
        if (endMarker.parentNode === target) target.removeChild(endMarker);
      };
    },
  );

  return (
    <Show when={!props.disabled && mount()} fallback={<>{props.children}</>}>
      {marker}
    </Show>
  );
};

export { PortalMount };
export type { PortalMountProps };
