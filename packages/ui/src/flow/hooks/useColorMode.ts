// @ts-nocheck
import type { ColorModeClass } from "@xyflow/system";
import { useStore } from "./useStore";

export function useColorMode(): { readonly current: ColorModeClass } {
	const store = useStore();
	return {
		get current() {
			return store.colorMode;
		},
	};
}
