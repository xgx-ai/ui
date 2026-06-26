// @ts-nocheck
import type { ConnectionState } from "@xyflow/system";
import { useStore } from "./useStore";

export function useConnection(): { readonly current: ConnectionState } {
	const store = useStore();
	return {
		get current() {
			return store.connection;
		},
	};
}
