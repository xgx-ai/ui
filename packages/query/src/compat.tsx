import type { JSX } from "@solidjs/web";
import {
	MutationObserver,
	QueryClient as CoreQueryClient,
	QueryObserver,
	keepPreviousData,
	type QueryClientConfig,
	type QueryKey,
} from "@tanstack/query-core";
import {
	createContext,
	createMemo,
	createStore,
	onSettled,
	useContext,
} from "solid-js";
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
	onSuccess?: (
		data: any,
		variables: any,
		onMutateResult: any,
		context: any,
	) => unknown;
	onSettled?: (
		data: any,
		error: any,
		variables: any,
		onMutateResult: any,
		context: any,
	) => unknown;
	invalidates?: readonly QueryKey[];
	[key: string]: any;
}>;
type AccessorValue<T> = T extends () => infer U ? U : T;
type QueryData<T> = AccessorValue<T> extends { queryFn?: (...args: any[]) => infer R }
	? Awaited<R>
	: unknown;
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

export function QueryClientProvider(props: {
	client: QueryClient;
	children?: JSX.Element;
}) {
	onSettled(() => {
		props.client.mount();
		return () => props.client.unmount();
	});

	return (
		<QueryClientContext value={props.client}>{props.children}</QueryClientContext>
	);
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
	const observer = new QueryObserver(queryClient(), queryOptions());
	const [state, setState] = createStore<any>(
		observer.getOptimisticResult(queryClient().defaultQueryOptions(queryOptions())),
	);
	const updateState = (next: unknown) => {
		setState((draft: Record<string, unknown>) => {
			Object.assign(draft, next);
		});
	};

	onSignal(queryOptions, (nextOptions) => {
		observer.setOptions(nextOptions);
		updateState(observer.getCurrentResult());
	});

	onSettled(() => {
		const unsubscribe = observer.subscribe((result) => {
			updateState(result);
		});

		return unsubscribe;
	});

	return state as QueryResult<QueryData<TOptions>>;
}

export const createQuery = useQuery;
export const createValueQuery = useQuery;

export function useMutation(
	options: MutationOptions,
	client?: () => QueryClient,
): any {
	const contextClient = client ? undefined : useQueryClient();
	const queryClient = createMemo(() => client?.() ?? contextClient!);
	const mutationOptions = createMemo(() => readOptions(options));
	const resolvedOptions = () => {
		const { invalidates, onSuccess, ...rest } = mutationOptions();
		return {
			...rest,
			onSuccess: async (...args: unknown[]) => {
				await (onSuccess as any)?.(...args);
				for (const queryKey of invalidates ?? []) {
					await queryClient().invalidateQueries(queryKey);
				}
			},
		};
	};
	const observer = new MutationObserver(queryClient(), resolvedOptions() as any);
	const mutate = (
		variables: unknown,
		mutateOptions?: Parameters<typeof observer.mutate>[1],
	) => {
		(observer as any).mutate(variables, mutateOptions).catch(() => undefined);
	};
	const [state, setState] = createStore<any>({
		...observer.getCurrentResult(),
		mutate,
		mutateAsync: (observer.getCurrentResult() as any).mutate,
	});
	const updateState = (next: Record<string, unknown>) => {
		setState((draft: Record<string, unknown>) => {
			Object.assign(draft, next);
		});
	};

	onSignal(mutationOptions, () => {
		observer.setOptions(resolvedOptions() as any);
	});

	onSettled(() => {
		const unsubscribe = observer.subscribe((result) => {
			updateState({
				...result,
				mutate,
				mutateAsync: (result as any).mutate,
			});
		});

		return unsubscribe;
	});

	return state;
}

export const createMutation = useMutation;
