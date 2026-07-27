import type { JSX } from "@solidjs/web";
import { omit } from "solid-js";

import { cn } from "../cn";

export interface EndOfResultsProps {
  class?: string;
  /** Custom message */
  message?: string;
}

/**
 * End of results indicator for infinite scroll lists.
 *
 * @example
 * ```tsx
 * <Show when={!hasNextPage && items.length > 0}>
 *   <EndOfResults />
 * </Show>
 * ```
 */
export function EndOfResults(props: EndOfResultsProps): JSX.Element {
  const local = props;
  const rest = omit(props, "class", "message");

  return (
    <div class={cn("text-center py-2 text-xs text-muted-foreground", local.class)} {...rest}>
      {local.message ?? "End of results"}
    </div>
  );
}
