import { type JSX, Suspense } from "solid-js";
import { cn } from "../cn.ts";
import { Spinner } from "./spinner.tsx";

interface SuspenseFallbackProps {
  /** Additional CSS classes for the fallback container */
  class?: string;
  /** Content to render once loaded */
  children?: JSX.Element;
}

function SuspenseFallback(props: SuspenseFallbackProps) {
  return (
    <Suspense
      fallback={
        <div
          class={cn(
            "flex items-center justify-center w-full h-full min-h-24",
            props.class,
          )}
        >
          <Spinner class="size-8 text-muted-foreground" />
        </div>
      }
    >
      {props.children}
    </Suspense>
  );
}

/**
 * # SuspenseFallback
 *
 * A Suspense wrapper that displays a centered Spinner while children are loading.
 *
 * @example
 * ```
 * <div class="space-y-4">
 *   <SuspenseFallback>
 *     <div class="p-4 border rounded">Content loaded!</div>
 *   </SuspenseFallback>
 * </div>
 * ```
 */
export { SuspenseFallback };
export type { SuspenseFallbackProps };
