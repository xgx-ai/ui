import type { JSX } from "@solidjs/web";
import { splitProps } from "../utils/split-props";
import { For, type ParentProps } from "solid-js";
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
        "flex items-center gap-2 border-b border-border-subtle bg-surface-muted px-3 py-2",
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
  const [local, rest] = splitProps(props, ["class", "value", "onInput", "placeholder", "icon"]);
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
export function ToolbarSort<T extends string>(props: ToolbarSortProps<T>): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "label", "value", "onChange", "options"]);
  return (
    <div class={cn("flex items-center gap-2", local.class)} {...rest}>
      <label class="flex items-center gap-2">
        {local.label && <span class="xgx-text-caption text-muted-foreground">{local.label}</span>}
        <select
          value={local.value}
          onChange={(e) => local.onChange(e.currentTarget.value as T)}
          class="xgx-control-text-md h-8 rounded-md border bg-background px-2"
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
  const [local, rest] = splitProps(props, ["class", "value", "onChange", "options"]);

  return (
    <div
      class={cn(
        "relative flex items-center gap-0.5 rounded-full border border-control-border bg-control p-0.5 text-control-foreground",
        local.class,
      )}
      {...rest}
    >
      <For each={local.options}>
        {(option) => (
          <button
            type="button"
            aria-pressed={local.value === option.id ? "true" : "false"}
            data-pressed={local.value === option.id ? "" : undefined}
            onClick={() => local.onChange(option.id)}
            class={cn(
              "xgx-control-text-sm h-7 rounded-full px-3 font-medium transition-colors",
              local.value === option.id
                ? "bg-control-active text-control-active-foreground shadow-sm"
                : "text-control-muted-foreground hover:bg-control-hover hover:text-control-hover-foreground",
            )}
          >
            {option.label}
          </button>
        )}
      </For>
    </div>
  );
}
