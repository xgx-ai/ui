/**
 * # Search
 *
 * Provides a combobox-style search surface with keyboard selection.
 *
 * @example
 * ```tsx
 * <Search options={users} optionValue="id" optionTextValue="name">
 *   <SearchControl>
 *     <SearchInput placeholder="Search users" />
 *   </SearchControl>
 *   <SearchContent>
 *     <SearchListbox />
 *   </SearchContent>
 * </Search>
 * ```
 */
import type { ComponentProps, JSX } from "@solidjs/web";
import {
  createContext,
  createEffect,
  createSignal,
  createUniqueId,
  For,
  Show,
  useContext,
} from "solid-js";
import { cn } from "../cn";
import { assignRef, containsNode } from "../overlays/floating";
import { PopperPositioner, PopperRoot } from "../overlays/popper";
import { PortalMount } from "../overlays/portal";
import { splitProps } from "../utils/split-props";

type OptionGetter<T, TValue> = keyof T | ((option: T) => TValue);

export type SearchOption<T = unknown> = {
  disabled: boolean;
  id?: string;
  label: JSX.Element;
  rawValue: T;
  textValue: string;
  value: string;
};

type SearchRootProps<T> = Omit<ComponentProps<"div">, "onChange"> & {
  defaultFilter?: (option: T, inputValue: string) => boolean;
  defaultValue?: T | T[] | null;
  debounceOptionsMillisecond?: number;
  disabled?: boolean;
  disallowEmptySelection?: boolean;
  itemComponent?: (props: { item: SearchOption<T> }) => JSX.Element;
  multiple?: boolean;
  open?: boolean;
  onChange?: (value: any) => void;
  onInputChange?: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
  optionDisabled?: OptionGetter<T, boolean>;
  optionLabel?: OptionGetter<T, JSX.Element>;
  optionTextValue?: OptionGetter<T, string>;
  optionValue?: OptionGetter<T, string>;
  options?: T[];
  placeholder?: string;
  removeOnBackspace?: boolean;
  sectionComponent?: (props: { section: SearchOption<T> }) => JSX.Element;
  triggerMode?: "focus" | "input";
  value?: T | T[] | null;
};

type SearchContextValue = {
  anchorRef: () => HTMLElement | undefined;
  close: () => void;
  contentRef: () => HTMLElement | undefined;
  disabled: () => boolean;
  filteredOptions: () => SearchOption[];
  inputValue: () => string;
  isSelected: (item: SearchOption) => boolean;
  highlightedOptionId: () => string | undefined;
  itemComponent: () => ((props: { item: SearchOption }) => JSX.Element) | undefined;
  multiple: () => boolean;
  open: () => boolean;
  placeholder: () => string | undefined;
  clear: () => void;
  listboxId: string;
  onSearchKeyDown: (event: KeyboardEvent) => void;
  remove: (item: unknown) => void;
  select: (item: SearchOption) => void;
  setAnchorRef: (element: HTMLElement) => void;
  setContentRef: (element: HTMLElement) => void;
  setInputValue: (value: string) => void;
  setOpen: (open: boolean) => void;
  selectedOption: () => unknown;
};

const SearchContext = createContext<SearchContextValue>();
const SearchItemContext = createContext<SearchOption>();

export function useSearchContext() {
  const context = useContext(SearchContext);
  if (!context) throw new Error("Search parts must be used inside Search.");
  return context;
}

export function useSearchItemContext() {
  return useContext(SearchItemContext);
}

const getOptionValue = <T,>(option: T, getter: OptionGetter<T, unknown> | undefined) => {
  if (typeof getter === "function") return getter(option);
  if (getter) return (option as Record<PropertyKey, unknown>)[getter];
  return option;
};

const toSearchOption = <T,>(option: T, props: SearchRootProps<T>): SearchOption<T> => {
  const value = getOptionValue(option, props.optionValue);
  const text = getOptionValue(option, props.optionTextValue) ?? value;
  const label = getOptionValue(option, props.optionLabel) ?? text;
  const disabled = props.optionDisabled
    ? Boolean(getOptionValue(option, props.optionDisabled))
    : false;
  return {
    disabled,
    label: label as JSX.Element,
    rawValue: option,
    textValue: String(text ?? ""),
    value: String(value ?? ""),
  };
};

const valueKey = <T,>(option: T | null | undefined, props: SearchRootProps<T>) =>
  option == null ? undefined : String(getOptionValue(option, props.optionValue) ?? "");

const Search = <T,>(props: SearchRootProps<T>) => {
  const [local, others] = splitProps(props, [
    "children",
    "class",
    "debounceOptionsMillisecond",
    "defaultValue",
    "defaultFilter",
    "disabled",
    "disallowEmptySelection",
    "itemComponent",
    "multiple",
    "onChange",
    "onInputChange",
    "onOpenChange",
    "open",
    "optionDisabled",
    "optionLabel",
    "optionTextValue",
    "optionValue",
    "options",
    "placeholder",
    "removeOnBackspace",
    "sectionComponent",
    "triggerMode",
    "value",
  ]);
  const [inputValue, setInputValueSignal] = createSignal("");
  const [highlightedIndex, setHighlightedIndex] = createSignal(-1);
  const [uncontrolledOpen, setOpenSignal] = createSignal(false);
  const [rootRef, setRootRef] = createSignal<HTMLDivElement>();
  const [anchorRef, setAnchorRef] = createSignal<HTMLElement>();
  const [contentRef, setContentRef] = createSignal<HTMLElement>();
  const [uncontrolledValue, setUncontrolledValue] = createSignal<any>(
    local.defaultValue ?? (local.multiple ? [] : null),
  );
  const listboxId = createUniqueId();
  const selectedValue = () => local.value ?? uncontrolledValue();
  const options = () =>
    (local.options ?? []).map((option, index) => ({
      ...toSearchOption(option, props),
      id: `${listboxId}-${index}`,
    }));
  const filteredOptions = () => {
    const query = inputValue().trim().toLowerCase();
    if (!query) return options();
    return options().filter((option) =>
      props.defaultFilter
        ? props.defaultFilter(option.rawValue as T, inputValue())
        : option.textValue.toLowerCase().includes(query),
    );
  };
  const open = () => local.open ?? uncontrolledOpen();
  const setOpen = (next: boolean) => {
    if (local.open === undefined) setOpenSignal(next);
    local.onOpenChange?.(next);
  };
  const firstEnabledIndex = () => filteredOptions().findIndex((option) => !option.disabled);
  const lastEnabledIndex = () => {
    const items = filteredOptions();
    for (let index = items.length - 1; index >= 0; index -= 1) {
      if (!items[index].disabled) return index;
    }
    return -1;
  };
  const moveHighlight = (direction: 1 | -1) => {
    const items = filteredOptions();
    if (items.length === 0) {
      setHighlightedIndex(-1);
      return;
    }

    const start = highlightedIndex() < 0 ? (direction > 0 ? -1 : items.length) : highlightedIndex();
    for (let offset = 1; offset <= items.length; offset += 1) {
      const index = (start + direction * offset + items.length) % items.length;
      if (!items[index].disabled) {
        setHighlightedIndex(index);
        return;
      }
    }
  };
  const highlightedOption = () => filteredOptions()[highlightedIndex()];
  const highlightedOptionId = () => highlightedOption()?.id;
  const setInputValue = (next: string) => {
    setInputValueSignal(next);
    local.onInputChange?.(next);
    setOpen(true);
  };
  const isSelected = (item: SearchOption) => {
    const current = selectedValue();
    if (Array.isArray(current)) {
      return current.some((option) => valueKey(option as T, props) === item.value);
    }
    return valueKey(current as T | null | undefined, props) === item.value;
  };
  const commitValue = (next: T | T[] | null) => {
    if (local.value === undefined) {
      (setUncontrolledValue as (value: any) => void)(next);
    }
    local.onChange?.(next);
  };
  const clear = () => commitValue(local.multiple ? [] : null);
  const remove = (item: unknown) => {
    const current = selectedValue();
    if (!Array.isArray(current)) {
      clear();
      return;
    }
    const removeKey = valueKey(item as T, props);
    commitValue(current.filter((option) => valueKey(option as T, props) !== removeKey));
  };
  const select = (item: SearchOption) => {
    if (item.disabled || local.disabled) return;
    if (local.multiple) {
      const current = selectedValue();
      const selected = Array.isArray(current) ? [...current] : [];
      const exists = selected.findIndex((option) => valueKey(option as T, props) === item.value);
      if (exists >= 0) selected.splice(exists, 1);
      else selected.push(item.rawValue as T);
      commitValue(selected);
      return;
    }
    commitValue(item.rawValue as T);
    setInputValueSignal(item.textValue);
    setOpen(false);
  };
  const selectHighlighted = () => {
    const item = highlightedOption();
    if (item) select(item);
  };
  const onSearchKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || disabled()) return;

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      moveHighlight(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      moveHighlight(-1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setHighlightedIndex(firstEnabledIndex());
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setHighlightedIndex(lastEnabledIndex());
      return;
    }

    if (event.key === "Enter" && open()) {
      event.preventDefault();
      selectHighlighted();
    }
  };
  const floatingAnchor = () => anchorRef() ?? rootRef();
  const disabled = () => Boolean(local.disabled);

  createEffect(open, (isOpen) => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!containsNode(rootRef(), target) && !containsNode(contentRef(), target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  });

  createEffect(
    () => ({
      length: filteredOptions().length,
      open: open(),
    }),
    (state) => {
      if (!state.open) {
        setHighlightedIndex(-1);
        return;
      }

      if (state.length === 0) {
        setHighlightedIndex(-1);
        return;
      }

      const current = highlightedIndex();
      if (current < 0 || current >= state.length || filteredOptions()[current]?.disabled) {
        setHighlightedIndex(firstEnabledIndex());
      }
    },
  );

  return (
    <SearchContext
      value={{
        anchorRef: floatingAnchor,
        close: () => setOpen(false),
        contentRef,
        disabled,
        filteredOptions,
        highlightedOptionId,
        inputValue,
        isSelected,
        itemComponent: () =>
          local.itemComponent as ((props: { item: SearchOption }) => JSX.Element) | undefined,
        listboxId,
        multiple: () => Boolean(local.multiple),
        onSearchKeyDown,
        open,
        placeholder: () => local.placeholder,
        clear,
        remove,
        select,
        setAnchorRef,
        setContentRef,
        setInputValue,
        setOpen,
        selectedOption: selectedValue,
      }}
    >
      <PopperRoot
        anchorRef={floatingAnchor}
        contentRef={contentRef}
        fitViewport
        gutter={4}
        open={open}
        placement="bottom-start"
        sameWidth
      >
        <div ref={setRootRef} class={cn("relative", local.class)} {...others}>
          {local.children}
        </div>
      </PopperRoot>
    </SearchContext>
  );
};

type SearchItemProps = ComponentProps<"li"> & {
  item: SearchOption;
};

const SearchItem = (props: SearchItemProps) => {
  const context = useSearchContext();
  const [local, others] = splitProps(props, ["class", "children", "item"]);
  const selected = () => context.isSelected(local.item);
  const onMouseDown: JSX.EventHandler<HTMLLIElement, MouseEvent> = (event) => {
    event.preventDefault();
  };
  const onClick: JSX.EventHandler<HTMLLIElement, MouseEvent> = () => {
    context.select(local.item);
  };

  return (
    <SearchItemContext value={local.item}>
      <li
        role="option"
        aria-selected={selected() ? "true" : "false"}
        data-selected={selected() ? "" : undefined}
        data-highlighted={context.highlightedOptionId() === local.item.id ? "" : undefined}
        data-disabled={local.item.disabled ? "" : undefined}
        id={local.item.id}
        class={cn(
          "relative flex cursor-default select-none items-center justify-between rounded-sm px-2 py-1.5 text-xs outline-hidden hover:bg-accent hover:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[selected]:bg-accent data-[selected]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          local.class,
        )}
        onMouseDown={onMouseDown}
        onClick={onClick}
        {...others}
      >
        {local.children}
      </li>
    </SearchItemContext>
  );
};

const SearchItemLabel = (props: ComponentProps<"span">) => {
  const item = useContext(SearchItemContext);
  const [local, others] = splitProps(props, ["children"]);
  return <span {...others}>{local.children ?? item?.label}</span>;
};

const SearchDescription = (props: ComponentProps<"div">) => <div {...props} />;

const SearchSection = (props: ComponentProps<"li">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <li
      class={cn(
        "overflow-hidden p-1 px-2 py-1.5 text-xs font-medium text-muted-foreground",
        local.class,
      )}
      {...others}
    />
  );
};

type SearchIndicatorProps = ComponentProps<"div"> & {
  loadingComponent?: JSX.Element;
};

const SearchIndicator = (props: SearchIndicatorProps) => {
  const [local, others] = splitProps(props, ["children", "class", "loadingComponent"]);
  return (
    <div class={cn("flex items-center justify-center", local.class)} {...others}>
      {local.children}
    </div>
  );
};

const SearchIcon = (props: ComponentProps<"span">) => {
  const [local, others] = splitProps(props, ["class"]);
  return <span class={cn("size-4", local.class)} {...others} />;
};

const SearchControl = <_T,>(props: ComponentProps<"div">) => {
  const context = useSearchContext();
  const [local, others] = splitProps(props, ["class", "onClick", "onKeyDown", "ref"]);
  const onClick: JSX.EventHandler<HTMLDivElement, MouseEvent> = (event) => {
    const handler = local.onClick as JSX.EventHandler<HTMLDivElement, MouseEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented && !context.disabled()) context.setOpen(true);
  };
  const onKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (event) => {
    const handler = local.onKeyDown as JSX.EventHandler<HTMLDivElement, KeyboardEvent> | undefined;
    handler?.(event);
    context.onSearchKeyDown(event);
  };
  return (
    <div
      class={cn(
        "flex h-10 items-center overflow-hidden rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        local.class,
      )}
      ref={(element) => {
        context.setAnchorRef(element);
        assignRef(local.ref, element);
      }}
      onClick={onClick}
      onKeyDown={onKeyDown}
      {...others}
    />
  );
};

const SearchInput = (props: ComponentProps<"input">) => {
  const context = useSearchContext();
  const [local, others] = splitProps(props, ["class", "onKeyDown", "onFocus", "onInput", "value"]);
  const onInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) => {
    context.setInputValue(event.currentTarget.value);
    const handler = local.onInput as JSX.EventHandler<HTMLInputElement, InputEvent> | undefined;
    handler?.(event);
  };
  const onKeyDown: JSX.EventHandler<HTMLInputElement, KeyboardEvent> = (event) => {
    const handler = local.onKeyDown as
      | JSX.EventHandler<HTMLInputElement, KeyboardEvent>
      | undefined;
    handler?.(event);
    context.onSearchKeyDown(event);
  };
  return (
    <input
      role="combobox"
      aria-activedescendant={context.highlightedOptionId()}
      aria-controls={context.listboxId}
      aria-expanded={context.open() ? "true" : "false"}
      aria-autocomplete="list"
      value={local.value ?? context.inputValue()}
      placeholder={context.placeholder()}
      disabled={context.disabled()}
      class={cn(
        "w-full bg-transparent px-3 py-2 text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        local.class,
      )}
      onInput={onInput}
      onKeyDown={onKeyDown}
      onFocus={(event: FocusEvent & { currentTarget: HTMLInputElement }) => {
        const handler = local.onFocus as JSX.EventHandler<HTMLInputElement, FocusEvent> | undefined;
        handler?.(
          event as FocusEvent & {
            currentTarget: HTMLInputElement;
            target: Element;
          },
        );
        if (!event.defaultPrevented) context.setOpen(true);
      }}
      {...others}
    />
  );
};

const SearchPortal = (props: { children?: JSX.Element }) => (
  <PortalMount>{props.children}</PortalMount>
);

const SearchContent = (
  props: ComponentProps<"div"> & { onCloseAutoFocus?: (event: Event) => void },
) => {
  const context = useSearchContext();
  const [local, others] = splitProps(props, ["class", "children", "onCloseAutoFocus", "ref"]);
  return (
    <Show when={context.open()}>
      <PopperPositioner>
        <div
          ref={(element) => {
            context.setContentRef(element);
            assignRef(local.ref, element);
          }}
          class={cn(
            "z-50 max-h-[var(--xgx-popper-content-available-height,20rem)] min-w-32 overflow-y-auto rounded-md border border-border-subtle bg-popover text-popover-foreground shadow-elevation-medium",
            local.class,
          )}
          {...others}
        >
          {local.children}
        </div>
      </PopperPositioner>
    </Show>
  );
};

const SearchListbox = (props: ComponentProps<"ul">) => {
  const context = useSearchContext();
  const [local, others] = splitProps(props, ["class"]);
  const renderItem = () => context.itemComponent();
  return (
    <ul id={context.listboxId} role="listbox" class={cn("m-0 p-1", local.class)} {...others}>
      <For each={context.filteredOptions()}>
        {(item) => {
          const ItemComponent = renderItem();
          return ItemComponent ? (
            ItemComponent({ item })
          ) : (
            <SearchItem item={item}>
              <SearchItemLabel />
            </SearchItem>
          );
        }}
      </For>
    </ul>
  );
};

type SearchNoResultProps = {
  class?: string | undefined;
  children?: JSX.Element;
};

const SearchNoResult = (props: SearchNoResultProps) => {
  const context = useSearchContext();
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <Show when={context.filteredOptions().length === 0}>
      <div class={cn("px-2 py-1.5 text-sm text-muted-foreground", local.class)} {...others}>
        {local.children}
      </div>
    </Show>
  );
};

export {
  Search,
  SearchContent,
  SearchControl,
  SearchDescription,
  SearchIcon,
  SearchIndicator,
  SearchInput,
  SearchItem,
  SearchItemLabel,
  SearchListbox,
  SearchNoResult,
  SearchPortal,
  SearchSection,
};
export type { SearchIndicatorProps, SearchItemProps, SearchNoResultProps, SearchRootProps };
