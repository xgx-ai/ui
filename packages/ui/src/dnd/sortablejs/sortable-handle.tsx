import type { ComponentProps, JSX, ValidComponent } from "@solidjs/web";
import { Dynamic } from "@solidjs/web";
import { omit } from "solid-js";
import { useSortableItem } from "./context";

export type SortableHandleProps<T extends ValidComponent = "button"> = ComponentProps<"button"> & {
  as?: T;
  children?: JSX.Element;
};

export function SortableHandle<T extends ValidComponent = "button">(props: SortableHandleProps<T>) {
  const item = useSortableItem();
  const local = props;
  const others = omit(props, "as", "children", "ref", "type");

  const setRef = (element: HTMLElement) => {
    item.setHandleRef(element);
    if (typeof local.ref === "function") local.ref(element as HTMLButtonElement);
  };

  return (
    <Dynamic
      component={local.as ?? "button"}
      ref={setRef}
      type={local.type ?? (local.as ? undefined : "button")}
      {...others}
    >
      {local.children}
    </Dynamic>
  );
}
