import type { JSX } from "@solidjs/web";
import {
  MutationObserver,
  QueryClient as CoreQueryClient,
  QueryObserver,
  keepPreviousData,
  type QueryClientConfig,
  type QueryKey,
} from "@tanstack/query-core";
import { createContext, createMemo, createStore, onCleanup, onSettled, useContext } from "solid-js";
import { onSignal } from "../../ui/src/utils/on-signal.ts";

export { keepPreviousData };
export type { QueryKey };

type MaybeAccessor<T> = T | (() => T);
type QueryOptions = MaybeAccessor<{
  queryKey: QueryKey;
  queryFn?: (context: any) => unknown;
  [key: string]: any;
}>;
type MutationOptions = MaybeAccessor<{
  mutationFn?: (variables: any) => unknown;
  onError?: (error: any, variables: any, context: any) => unknown;
  onSuccess?: (data: any, variables: any, onMutateResult: any, context: any) => unknown;
  onSettled?: (data: any, error: any, variables: any, onMutateResult: any, context: any) => unknown;
  invalidates?: readonly QueryKey[];
  [key: string]: any;
}>;
type AccessorValue<T> = T extends () => infer U ? U : T;
type QueryData<T> =
  AccessorValue<T> extends { queryFn?: (...args: any[]) => infer R } ? Awaited<R> : unknown;
type QueryResult<TData> = {
  data: TData | undefined;
  error: any;
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  isPending: boolean;
  refetch: (...args: any[]) => Promise<unknown>;
  [key: string]: any;
};

function readOptions<T>(options: MaybeAccessor<T>): T {
  return typeof options === "function" ? (options as () => T)() : options;
}

function normaliseQueryFilters(filters: QueryKey | { queryKey?: QueryKey }) {
  return Array.isArray(filters) ? { queryKey: filters } : filters;
}

export class QueryClient extends CoreQueryClient {
  constructor(config: QueryClientConfig = {}) {
    super(config);
  }

  invalidateQueries(
    filters?: QueryKey | Parameters<CoreQueryClient["invalidateQueries"]>[0],
    options?: Parameters<CoreQueryClient["invalidateQueries"]>[1],
  ) {
    return super.invalidateQueries(
      (filters ? normaliseQueryFilters(filters as any) : undefined) as any,
      options,
    );
  }
}

const QueryClientContext = createContext<QueryClient | undefined>(undefined);

export function QueryClientProvider(props: { client: QueryClient; children?: JSX.Element }) {
  onSettled(() => {
    props.client.mount();
    return () => props.client.unmount();
  });

  return <QueryClientContext value={props.client}>{props.children}</QueryClientContext>;
}

export function useQueryClient(client?: QueryClient) {
  const context = useContext(QueryClientContext);
  if (client) return client;
  if (!context) {
    throw new Error("No QueryClient set, use QueryClientProvider to set one");
  }
  return context;
}

export function useQuery<TOptions extends QueryOptions>(
  options: TOptions,
  client?: () => QueryClient,
): QueryResult<QueryData<TOptions>> {
  const contextClient = client ? undefined : useQueryClient();
  const queryClient = createMemo(() => client?.() ?? contextClient!);
  const queryOptions = createMemo(() => readOptions(options));
  let observer: QueryObserver | undefined;
  let observerClient: QueryClient | undefined;
  let unsubscribe: (() => void) | undefined;
  const refetch = (...args: unknown[]) => observer?.refetch(...(args as [])) ?? Promise.resolve();
  const [state, setState] = createStore<any>({
    data: undefined,
    error: null,
    isError: false,
    isFetching: false,
    isLoading: true,
    isPending: true,
    refetch,
  });
  const updateState = (next: unknown) => {
    setState((draft: Record<string, unknown>) => {
      Object.assign(draft, next);
      draft.refetch = refetch;
    });
  };

  onSignal(
    () => [queryClient(), queryOptions()] as const,
    ([nextClient, nextOptions]) => {
      if (!observer || observerClient !== nextClient) {
        unsubscribe?.();
        observer = new QueryObserver(nextClient, nextOptions);
        observerClient = nextClient;
        unsubscribe = observer.subscribe((result) => {
          updateState(result);
        });
        updateState(observer.getOptimisticResult(nextClient.defaultQueryOptions(nextOptions)));
        return;
      }

      observer.setOptions(nextOptions);
      updateState(observer.getCurrentResult());
    },
  );

  onCleanup(() => unsubscribe?.());

  return state as QueryResult<QueryData<TOptions>>;
}

export const createQuery = useQuery;
export const createValueQuery = useQuery;

export function useMutation(options: MutationOptions, client?: () => QueryClient): any {
  const contextClient = client ? undefined : useQueryClient();
  const queryClient = createMemo(() => client?.() ?? contextClient!);
  const mutationOptions = createMemo(() => readOptions(options));
  let observer: MutationObserver | undefined;
  let observerClient: QueryClient | undefined;
  let unsubscribe: (() => void) | undefined;
  const resolvedOptions = (
    nextOptions: AccessorValue<typeof mutationOptions>,
    nextClient: QueryClient,
  ) => {
    const { invalidates, onSuccess, ...rest } = nextOptions;
    return {
      ...rest,
      onSuccess: async (...args: unknown[]) => {
        await (onSuccess as any)?.(...args);
        for (const queryKey of invalidates ?? []) {
          await nextClient.invalidateQueries(queryKey);
        }
      },
    };
  };
  const mutate = (variables: unknown, mutateOptions?: any) => {
    (observer as any)?.mutate(variables, mutateOptions).catch(() => undefined);
  };
  const mutateAsync = (variables: unknown, mutateOptions?: any) =>
    (observer as any)?.mutate(variables, mutateOptions) ??
    Promise.reject(new Error("Mutation observer has not initialised"));
  const [state, setState] = createStore<any>({
    data: undefined,
    error: null,
    isError: false,
    isIdle: true,
    isPending: false,
    isSuccess: false,
    status: "idle",
    mutate,
    mutateAsync,
  });
  const updateState = (next: Record<string, unknown>) => {
    setState((draft: Record<string, unknown>) => {
      Object.assign(draft, next);
      draft.mutate = mutate;
      draft.mutateAsync = mutateAsync;
    });
  };

  onSignal(
    () => [queryClient(), mutationOptions()] as const,
    ([nextClient, nextOptions]) => {
      if (!observer || observerClient !== nextClient) {
        unsubscribe?.();
        observer = new MutationObserver(
          nextClient,
          resolvedOptions(nextOptions, nextClient) as any,
        );
        observerClient = nextClient;
        unsubscribe = observer.subscribe((result) => {
          updateState(result as unknown as Record<string, unknown>);
        });
        updateState(observer.getCurrentResult() as unknown as Record<string, unknown>);
        return;
      }

      observer.setOptions(resolvedOptions(nextOptions, nextClient) as any);
    },
  );

  onCleanup(() => unsubscribe?.());

  return state;
}

export const createMutation = useMutation;
