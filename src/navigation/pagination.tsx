import { type JSX, splitProps } from "solid-js";
import { cn } from "../cn";
import { Button } from "../forms/button";

export interface PaginationProps {
  class?: string;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/** Pagination controls */
export function Pagination(props: PaginationProps): JSX.Element {
  const [local] = splitProps(props, [
    "class",
    "page",
    "totalPages",
    "onPageChange",
  ]);

  return (
    <div class={cn("flex items-center justify-center gap-2", local.class)}>
      <Button
        variant="outline"
        size="sm"
        disabled={local.page === 1}
        onClick={() => local.onPageChange(local.page - 1)}
      >
        Previous
      </Button>
      <span class="px-4 text-sm">
        Page {local.page} of {local.totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={local.page === local.totalPages}
        onClick={() => local.onPageChange(local.page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
