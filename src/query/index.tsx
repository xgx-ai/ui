import type { JSX } from "@solidjs/web";
import {
  InfiniteQueryObserver,
  MutationObserver,
  QueryClient as CoreQueryClient,
  QueryObserver,
  notifyManager,
  type DefaultError,
  type InfiniteData,
  type InfiniteQueryObserverOptions,
  type InfiniteQueryObserverResult,
  type MutationObserverOptions,
  type MutationObserverResult,
  type QueryKey,
  type QueryObserverOptions,
  type QueryObserverResult,
} from "@tanstack/query-core";
import { createContext, createRenderEffect, createSignal, onCleanup, useContext } from "solid-js";

export * from "@tanstack/query-core";
export { CoreQueryClient as QueryClient };

const QueryClientContext = createContext<CoreQueryClient>();
const defaultQueryClient = new CoreQueryClient();

export function QueryClientProvider(props: { client: CoreQueryClient; children?: JSX.Element }) {
  createRenderEffect(
    () => props.client,
    (client, previous) => {
      previous?.unmount();
      client.mount();
    },
  );

  onCleanup(() => props.client.unmount());

  return <QueryClientContext value={props.client}>{props.children}</QueryClientContext>;
}

export function useQueryClient(queryClient?: CoreQueryClient): CoreQueryClient {
  return queryClient ?? useContext(QueryClientContext) ?? defaultQueryClient;
}

type QueryOptionsAccessor<TOptions> = () => TOptions;

function resultProxy<TResult extends object>(read: () => TResult): TResult {
  return new Proxy({} as TResult, {
    get(_, key) {
      const value = (read() as Record<PropertyKey, unknown>)[key];
      return typeof value === "function" ? value.bind(read()) : value;
    },
    has(_, key) {
      return key in (read() as object);
    },
    ownKeys() {
      return Reflect.ownKeys(read() as object);
    },
    getOwnPropertyDescriptor(_, key) {
      const descriptor = Object.getOwnPropertyDescriptor(read() as object, key);
      return descriptor ? { ...descriptor, configurable: true } : undefined;
    },
  });
}

type QueryObserverCtor = new (
  client: CoreQueryClient,
  options: any,
) => {
  getOptimisticResult: (options: any) => any;
  setOptions: (options: any) => void;
  subscribe: (listener: (result: any) => void) => () => void;
};

function useBaseQuery<TOptions, TResult extends object>(
  options: QueryOptionsAccessor<TOptions>,
  Observer: QueryObserverCtor,
  queryClient?: () => CoreQueryClient,
): TResult {
  const resolveClient = () => queryClient?.() ?? useQueryClient();
  let client = resolveClient();
  let observer = new Observer(client, client.defaultQueryOptions(options() as any));
  const [state, setState] = createSignal(
    {
      result: observer.getOptimisticResult(client.defaultQueryOptions(options() as any)) as TResult,
    },
    { equals: false },
  );
  let unsubscribe: (() => void) | undefined;

  const subscribe = () => {
    unsubscribe?.();
    unsubscribe = observer.subscribe(
      notifyManager.batchCalls((next) => setState({ result: next as TResult })),
    );
  };

  subscribe();

  createRenderEffect(
    () => ({
      client: resolveClient(),
      options: options(),
    }),
    (next) => {
      const defaultedOptions = next.client.defaultQueryOptions(next.options as any);

      if (next.client !== client) {
        unsubscribe?.();
        client = next.client;
        observer = new Observer(client, defaultedOptions);
        subscribe();
      }

      observer.setOptions(defaultedOptions);
      setState({
        result: observer.getOptimisticResult(defaultedOptions) as TResult,
      });
    },
  );

  onCleanup(() => unsubscribe?.());

  return resultProxy(() => state().result);
}

export function useQuery<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: QueryOptionsAccessor<
    QueryObserverOptions<TQueryFnData, TError, TData, TQueryFnData, TQueryKey>
  >,
  queryClient?: () => CoreQueryClient,
): QueryObserverResult<TData, TError> {
  return useBaseQuery(options, QueryObserver as QueryObserverCtor, queryClient);
}

export function useInfiniteQuery<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = InfiniteData<TQueryFnData>,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
>(
  options: QueryOptionsAccessor<
    InfiniteQueryObserverOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>
  >,
  queryClient?: () => CoreQueryClient,
): InfiniteQueryObserverResult<TData, TError> {
  return useBaseQuery(options, InfiniteQueryObserver as QueryObserverCtor, queryClient);
}

export function useMutation<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TOnMutateResult = unknown,
>(
  options: QueryOptionsAccessor<
    MutationObserverOptions<TData, TError, TVariables, TOnMutateResult>
  >,
  queryClient?: () => CoreQueryClient,
): MutationObserverResult<TData, TError, TVariables, TOnMutateResult> {
  const resolveClient = () => queryClient?.() ?? useQueryClient();
  let client = resolveClient();
  let observer = new MutationObserver(client, options());
  const [state, setState] = createSignal(
    {
      result: observer.getCurrentResult(),
    },
    {
      equals: false,
    },
  );
  let unsubscribe = observer.subscribe(
    notifyManager.batchCalls((next) => setState({ result: next })),
  );

  createRenderEffect(
    () => ({
      client: resolveClient(),
      options: options(),
    }),
    (next) => {
      if (next.client !== client) {
        unsubscribe();
        client = next.client;
        observer = new MutationObserver(next.client, next.options);
        unsubscribe = observer.subscribe(
          notifyManager.batchCalls((value) => setState({ result: value })),
        );
      }

      observer.setOptions(next.options);
      setState({ result: observer.getCurrentResult() });
    },
  );

  onCleanup(() => unsubscribe());

  return resultProxy(() => state().result) as MutationObserverResult<
    TData,
    TError,
    TVariables,
    TOnMutateResult
  >;
}
