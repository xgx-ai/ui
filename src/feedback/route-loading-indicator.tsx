import { type Accessor, createMemo, Show } from "solid-js";

interface RouteLoadingIndicatorProps {
  /** Accessor that returns true when a route transition is in progress */
  isLoading: Accessor<boolean>;
}

function RouteLoadingIndicator(props: RouteLoadingIndicatorProps) {
  const isLoading = createMemo(() => props.isLoading());

  return (
    <Show when={isLoading()}>
      <div class="fixed top-0 left-0 right-0 z-9999 h-0.5 overflow-hidden">
        <div class="route-loading-bar h-full w-full bg-primary" />
      </div>
      <style>{`
        @keyframes route-loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
        .route-loading-bar {
          animation: route-loading 1s ease-in-out infinite;
        }
      `}</style>
    </Show>
  );
}

function DefaultPendingComponent() {
  return (
    <div class="flex items-center justify-center h-full w-full min-h-[200px]">
      <div class="flex flex-col items-center gap-3">
        <div class="relative">
          <div class="w-8 h-8 border-2 border-primary/20 rounded-full" />
          <div class="absolute inset-0 w-8 h-8 border-2 border-transparent border-t-primary rounded-full animate-spin" />
        </div>
        <span class="text-sm text-muted-foreground">Loading...</span>
      </div>
    </div>
  );
}

/**
 * # RouteLoadingIndicator
 *
 * A subtle progress bar that appears at the top of the viewport during route transitions.
 *
 * @example
 * ```
 * <div class="relative h-24 border rounded-lg overflow-hidden">
 *   <RouteLoadingIndicator isLoading={() => true} />
 *   <div class="p-4 text-center text-muted-foreground">
 *     Loading bar appears at top
 *   </div>
 * </div>
 * ```
 */
export { DefaultPendingComponent, RouteLoadingIndicator };
export type { RouteLoadingIndicatorProps };
