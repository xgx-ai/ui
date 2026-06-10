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
  const content = createMemo(() => [startMarker, props.children]);

  createEffect(
    () => (props.disabled ? undefined : mount()),
    (target) => {
      if (!target) return;

      registerDelegatedContainer(target);
      return () => unregisterDelegatedContainer(target);
    },
  );

  createRenderEffect(
    () => ({
      content: content(),
      disabled: props.disabled,
      target: mount(),
    }),
    (state) => {
      if (state.disabled || !state.target) return;

      const target = state.target;
      target.appendChild(endMarker);
      insert(target, state.content, endMarker);

      return () => {
        let node: ChildNode | null = startMarker;
        while (node?.parentNode === target) {
          const next: ChildNode | null = node.nextSibling;
          target.removeChild(node);
          if (node === endMarker) break;
          node = next;
        }
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
