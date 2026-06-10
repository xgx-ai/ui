import type { ComponentProps, JSX } from "@solidjs/web";

export interface ActivityTimelineFilter {
  id: string;
  label: string;
}

export type ActivityTimelineProps<TItem = unknown> = ComponentProps<"div"> & {
  items: TItem[];
  hasMore: boolean;
  isFetching: boolean;
  onFetchMore: () => void;
  filters?: ActivityTimelineFilter[];
  selectedFilter?: string;
  onFilterChange?: (id: string) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  renderItem: (item: TItem) => JSX.Element;
  headerActions?: JSX.Element;
  emptyMessage?: string;
  loadingCount?: number;
};
