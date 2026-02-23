import { For, type JSX, type ParentProps, Show, splitProps } from "solid-js";
import { cn } from "../cn";

export interface DataGridColumn<T> {
  /** Unique key for the column */
  key: string;
  /** Header label */
  label?: string;
  /** Column width class (e.g., "col-span-3") */
  width: string;
  /** Custom render function for cell content */
  render?: (item: T, index: number) => JSX.Element;
  /** Header alignment */
  headerClass?: string;
}

export interface DataGridProps<T> {
  class?: string;
  /** Array of items to display */
  items: T[];
  /** Column definitions */
  columns: DataGridColumn<T>[];
  /** Total number of grid columns (default: 12) */
  gridCols?: number;
  /** Called when a row is clicked */
  onRowClick?: (item: T, index: number) => void;
  /** Called when a row is double-clicked */
  onRowDoubleClick?: (item: T, index: number) => void;
  /** Custom row class based on item */
  rowClass?: (item: T, index: number) => string;
  /** Whether rows are disabled */
  isRowDisabled?: (item: T, index: number) => boolean;
  /** Show loading state */
  isLoading?: boolean;
  /** Loading state content */
  loadingContent?: JSX.Element;
  /** Empty state content */
  emptyContent?: JSX.Element;
  /** Whether header is sticky */
  stickyHeader?: boolean;
}

/**
 * Data grid component for displaying tabular data.
 *
 * @example
 * ```tsx
 * <DataGrid
 *   items={documents}
 *   columns={[
 *     { key: 'name', label: 'Name', width: 'col-span-6', render: (doc) => <FileIcon /> {doc.name} },
 *     { key: 'type', label: 'Type', width: 'col-span-2' },
 *     { key: 'date', label: 'Modified', width: 'col-span-2', render: (doc) => formatDate(doc.updatedAt) },
 *     { key: 'actions', width: 'col-span-2', render: (doc) => <ActionMenu doc={doc} /> },
 *   ]}
 *   onRowClick={(doc) => handleClick(doc)}
 *   emptyContent={<EmptyState icon={<Folder />} title="No files" />}
 * />
 * ```
 */
export function DataGrid<T>(props: DataGridProps<T>): JSX.Element {
  const [local, rest] = splitProps(props, [
    "class",
    "items",
    "columns",
    "gridCols",
    "onRowClick",
    "onRowDoubleClick",
    "rowClass",
    "isRowDisabled",
    "isLoading",
    "loadingContent",
    "emptyContent",
    "stickyHeader",
  ]);

  const gridColsClass = () => {
    const cols = local.gridCols ?? 12;
    return `grid-cols-${cols}`;
  };

  return (
    <div
      class={cn("flex flex-col min-h-0 overflow-hidden", local.class)}
      {...rest}
    >
      {/* Header */}
      <div
        class={cn(
          "grid gap-3 px-4 py-2 border-b text-xs font-medium text-muted-foreground bg-background",
          gridColsClass(),
          local.stickyHeader && "sticky top-0 z-10",
        )}
      >
        <For each={local.columns}>
          {(col) => (
            <div class={cn(col.width, col.headerClass)}>{col.label}</div>
          )}
        </For>
      </div>

      {/* Body */}
      <div class="flex-1 overflow-y-auto">
        <Show when={local.isLoading}>{local.loadingContent}</Show>

        <Show when={!local.isLoading && local.items.length === 0}>
          {local.emptyContent}
        </Show>

        <Show when={!local.isLoading && local.items.length > 0}>
          <For each={local.items}>
            {(item, index) => {
              const disabled = () =>
                local.isRowDisabled?.(item, index()) ?? false;
              const customClass = () => local.rowClass?.(item, index()) ?? "";

              return (
                <button
                  type="button"
                  onClick={() =>
                    !disabled() && local.onRowClick?.(item, index())
                  }
                  onDblClick={() =>
                    !disabled() && local.onRowDoubleClick?.(item, index())
                  }
                  disabled={disabled()}
                  class={cn(
                    "w-full grid gap-3 items-center px-4 py-2 text-left transition-colors",
                    "hover:bg-muted/60 border-b border-muted/30",
                    gridColsClass(),
                    disabled() && "opacity-50 cursor-not-allowed",
                    customClass(),
                  )}
                >
                  <For each={local.columns}>
                    {(col) => (
                      <div class={cn(col.width, "min-w-0")}>
                        {col.render
                          ? col.render(item, index())
                          : ((item as Record<string, unknown>)[
                              col.key
                            ] as JSX.Element)}
                      </div>
                    )}
                  </For>
                </button>
              );
            }}
          </For>
        </Show>
      </div>
    </div>
  );
}

export interface DataGridCellProps extends ParentProps {
  class?: string;
}

/**
 * Utility component for data grid cells with common styling.
 */
export function DataGridCell(props: DataGridCellProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div class={cn("flex items-center gap-2 min-w-0", local.class)} {...rest}>
      {local.children}
    </div>
  );
}

export interface DataGridTextProps extends ParentProps {
  class?: string;
  truncate?: boolean;
  muted?: boolean;
}

/**
 * Text styling for data grid cells.
 */
export function DataGridText(props: DataGridTextProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "class",
    "children",
    "truncate",
    "muted",
  ]);
  return (
    <span
      class={cn(
        "text-xs",
        local.truncate !== false && "truncate",
        local.muted && "text-muted-foreground",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </span>
  );
}
