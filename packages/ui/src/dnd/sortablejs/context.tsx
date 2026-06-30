import type { JSX } from "@solidjs/web";
import { createContext, useContext } from "solid-js";

export interface SortableItemState {
  readonly index: number;
  readonly isDragging: boolean;
  readonly isGhost: boolean;
  setHandleRef: (element: HTMLElement | null | undefined) => void;
}

export interface SortableItemContextValue extends SortableItemState {}

export const SortableItemContext = createContext<SortableItemContextValue>();

export function SortableItemProvider(props: {
  value: SortableItemContextValue;
  children: JSX.Element;
}) {
  return <SortableItemContext value={props.value}>{props.children}</SortableItemContext>;
}

export function useSortableItem(): SortableItemState {
  const context = useContext(SortableItemContext);
  if (!context) {
    throw new Error("useSortableItem must be used within a Sortable item render function");
  }
  return context;
}
