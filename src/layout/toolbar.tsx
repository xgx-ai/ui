import {
  createEffect,
  createSignal,
  For,
  type JSX,
  onMount,
  type ParentProps,
  splitProps,
} from "solid-js";
import { cn } from "../cn";
import { SearchBar } from "../forms/search-bar";

export interface ToolbarProps extends ParentProps {
  class?: string;
}

/**
 * Toolbar container for action bars with search, filters, and buttons.
 * Children are laid out horizontally with gap-2.
 *
 * @example
 * ```tsx
 * <Toolbar>
 *   <ToolbarSearch value={search} onChange={setSearch} />
 *   <ToolbarSpacer />
 *   <Button>Action</Button>
 * </Toolbar>
 * ```
 */
export function Toolbar(props: ToolbarProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div
      class={cn(
        "flex items-center gap-2 px-3 py-2 bg-muted/50 border-b",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}

export interface ToolbarSearchProps {
  class?: string;
  value: string;
  onInput: (value: string) => void;
  placeholder?: string;
  icon?: JSX.Element;
}

/**
 * Search input for toolbars. Wraps the shared SearchBar component.
 */
export function ToolbarSearch(props: ToolbarSearchProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "class",
    "value",
    "onInput",
    "placeholder",
    "icon",
  ]);
  return (
    <SearchBar
      class={cn("flex-1 max-w-xs", local.class)}
      size="sm"
      value={local.value}
      onChange={local.onInput}
      placeholder={local.placeholder}
      icon={local.icon}
      {...rest}
    />
  );
}

export interface ToolbarSpacerProps {
  class?: string;
}

/**
 * Flexible spacer to push items apart in a toolbar.
 */
export function ToolbarSpacer(props: ToolbarSpacerProps): JSX.Element {
  return <div class={cn("flex-1", props.class)} />;
}

export interface ToolbarGroupProps extends ParentProps {
  class?: string;
}

/**
 * Groups toolbar items together with smaller gap.
 */
export function ToolbarGroup(props: ToolbarGroupProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div class={cn("flex items-center gap-1.5", local.class)} {...rest}>
      {local.children}
    </div>
  );
}

export interface ToolbarSortProps<T extends string> {
  class?: string;
  label?: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}

/**
 * Sort dropdown for toolbars.
 */
export function ToolbarSort<T extends string>(
  props: ToolbarSortProps<T>,
): JSX.Element {
  const [local, rest] = splitProps(props, [
    "class",
    "label",
    "value",
    "onChange",
    "options",
  ]);
  return (
    <div class={cn("flex items-center gap-2", local.class)} {...rest}>
      <label class="flex items-center gap-2">
        {local.label && (
          <span class="text-xs text-muted-foreground">{local.label}</span>
        )}
        <select
          value={local.value}
          onChange={(e) => local.onChange(e.currentTarget.value as T)}
          class="h-8 text-xs border rounded-md px-2 bg-background"
        >
          <For each={local.options}>
            {(option) => <option value={option.value}>{option.label}</option>}
          </For>
        </select>
      </label>
    </div>
  );
}

export interface ToolbarFilterButtonsProps<T extends string> {
  class?: string;
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ id: T; label: string }>;
}

/**
 * Toggle button group for filtering in toolbars.
 * Shows as inline toggle buttons - useful for quick filter switching.
 *
 * @example
 * ```tsx
 * <ToolbarFilterButtons
 *   value={filter}
 *   onChange={setFilter}
 *   options={[
 *     { id: 'all', label: 'All' },
 *     { id: 'active', label: 'Active' },
 *     { id: 'completed', label: 'Completed' },
 *   ]}
 * />
 * ```
 */
export function ToolbarFilterButtons<T extends string>(
  props: ToolbarFilterButtonsProps<T>,
): JSX.Element {
  const [local, rest] = splitProps(props, [
    "class",
    "value",
    "onChange",
    "options",
  ]);

  let containerRef!: HTMLDivElement;
  const buttonRefs = new Map<T, HTMLButtonElement>();
  const [pillStyle, setPillStyle] = createSignal({ left: 0, width: 0 });
  const [ready, setReady] = createSignal(false);

  const updatePill = () => {
    const btn = buttonRefs.get(local.value);
    if (!btn || !containerRef) return;
    const containerRect = containerRef.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setPillStyle({
      left: btnRect.left - containerRect.left,
      width: btnRect.width,
    });
  };

  onMount(() => {
    requestAnimationFrame(() => {
      updatePill();
      setReady(true);
    });
  });

  createEffect(() => {
    local.value;
    updatePill();
  });

  return (
    <div
      ref={containerRef}
      class={cn(
        "relative flex items-center gap-0.5 border border-black/10 rounded-full p-0.5 bg-white",
        local.class,
      )}
      {...rest}
    >
      <div
        class="absolute rounded-full bg-secondary shadow-sm"
        style={{
          left: `${pillStyle().left}px`,
          width: `${pillStyle().width}px`,
          top: "2px",
          bottom: "2px",
          transition: ready() ? "left 200ms ease, width 200ms ease" : "none",
        }}
      />
      <For each={local.options}>
        {(option) => (
          <button
            ref={(el) => buttonRefs.set(option.id, el)}
            type="button"
            onClick={() => local.onChange(option.id)}
            class={cn(
              "relative z-10 px-3 py-1 text-xs rounded-full transition-colors duration-200",
              local.value === option.id && ready()
                ? "text-white"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {option.label}
          </button>
        )}
      </For>
    </div>
  );
}
