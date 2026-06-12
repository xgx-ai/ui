import type { JSX } from "@solidjs/web";

import { Show } from "solid-js";
import { Center } from "../layout/stack";
import { ErrorAlert } from "./error-alert";
import { Spinner } from "./spinner";

export interface QueryBoundaryProps<T> {
  /** Query result data */
  data: T | undefined;
  /** Whether query is loading */
  isLoading: boolean;
  /** Whether query has error */
  isError?: boolean;
  /** Error object */
  error?: Error | null;
  /** Check if data is empty (default: checks array length or undefined) */
  isEmpty?: (data: T) => boolean;
  /** Loading fallback - defaults to centered Spinner */
  loadingFallback?: JSX.Element;
  /** Error fallback - defaults to ErrorAlert */
  errorFallback?: JSX.Element | ((error: Error) => JSX.Element);
  /** Empty state fallback */
  emptyFallback?: JSX.Element;
  /** Render function when data is available and not empty */
  children: (data: T) => JSX.Element;
}

/**
 * # QueryBoundary
 *
 * Handles loading, error, and empty states for query results.
 * Provides a clean way to compose data fetching UI without nested Show/Suspense.
 *
 * @example
 * ```tsx
 * <QueryBoundary
 *   data={query.data}
 *   isLoading={query.isLoading}
 *   isError={query.isError}
 *   error={query.error}
 *   emptyFallback={
 *     <EmptyState>
 *       <EmptyStateIcon><FileText /></EmptyStateIcon>
 *       <EmptyStateTitle>No documents</EmptyStateTitle>
 *     </EmptyState>
 *   }
 * >
 *   {(data) => <DocumentList items={data} />}
 * </QueryBoundary>
 * ```
 */
export function QueryBoundary<T>(props: QueryBoundaryProps<T>): JSX.Element {
  const defaultIsEmpty = (data: T): boolean => {
    if (data === undefined || data === null) return true;
    if (Array.isArray(data)) return data.length === 0;
    return false;
  };

  const isEmpty = () => {
    if (!props.data) return true;
    const checkEmpty = props.isEmpty ?? defaultIsEmpty;
    return checkEmpty(props.data);
  };

  const renderError = () => {
    if (!props.error) return null;
    if (typeof props.errorFallback === "function") {
      return props.errorFallback(props.error);
    }
    return props.errorFallback ?? <ErrorAlert error={props.error} />;
  };

  return (
    <Show
      when={!props.isLoading}
      fallback={
        props.loadingFallback ?? (
          <Center w="full" p="8">
            <Spinner size="lg" />
          </Center>
        )
      }
    >
      <Show when={!props.isError} fallback={renderError()}>
        <Show when={!isEmpty()} fallback={props.emptyFallback}>
          {props.children(props.data as T)}
        </Show>
      </Show>
    </Show>
  );
}
