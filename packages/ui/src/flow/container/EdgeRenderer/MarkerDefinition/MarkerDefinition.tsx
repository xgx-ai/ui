import { For } from "solid-js";
import { useStore } from "../../../store";
import { Marker } from "./Marker";

export function MarkerDefinition() {
	const store = useStore();

	return (
		<defs>
			<For each={store.markers}>{(marker) => <Marker {...marker} />}</For>
		</defs>
	);
}
