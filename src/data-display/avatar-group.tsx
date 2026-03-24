import type { Component, ComponentProps } from "solid-js";
import { For, Show, splitProps } from "solid-js";
import { cn } from "../cn";

interface AvatarGroupItem {
	id: string;
	name: string;
	image?: string | null;
}

type AvatarGroupProps = ComponentProps<"div"> & {
	items: AvatarGroupItem[];
	max?: number;
	size?: "xs" | "sm" | "md";
};

const sizeClasses = {
	xs: "size-5",
	sm: "size-6",
	md: "size-8",
} as const;

const textSizeClasses = {
	xs: "text-[8px]",
	sm: "text-[9px]",
	md: "text-[10px]",
} as const;

function getInitials(name: string): string {
	return name
		.split(" ")
		.filter((w) => w.length > 0)
		.map((w) => w[0].toUpperCase())
		.slice(0, 2)
		.join("");
}

const AvatarGroup: Component<AvatarGroupProps> = (props) => {
	const [local, others] = splitProps(props, [
		"items",
		"max",
		"size",
		"class",
	]);

	const maxVisible = () => local.max ?? 4;
	const size = () => local.size ?? "sm";
	const visible = () => local.items.slice(0, maxVisible());
	const overflow = () => local.items.length - maxVisible();

	return (
		<div
			class={cn("flex items-center -space-x-1.5", local.class)}
			{...others}
		>
			<For each={visible()}>
				{(item) => (
					<Show
						when={item.image}
						fallback={
							<div
								class={cn(
									"rounded-full border-2 border-white ring-1 ring-white flex items-center justify-center bg-primary/10 text-primary font-medium",
									sizeClasses[size()],
									textSizeClasses[size()],
								)}
								title={item.name}
							>
								{getInitials(item.name)}
							</div>
						}
					>
						<img
							src={item.image!}
							alt={item.name}
							title={item.name}
							class={cn(
								"rounded-full border-2 border-white ring-1 ring-white object-cover",
								sizeClasses[size()],
							)}
						/>
					</Show>
				)}
			</For>
			<Show when={overflow() > 0}>
				<div
					class={cn(
						"rounded-full border-2 border-white ring-1 ring-white flex items-center justify-center bg-muted text-muted-foreground font-medium",
						sizeClasses[size()],
						textSizeClasses[size()],
					)}
				>
					+{overflow()}
				</div>
			</Show>
		</div>
	);
};

/**
 * # AvatarGroup
 *
 * Overlapping avatar stack with "+N" overflow indicator.
 *
 * @example
 * ```
 * <AvatarGroup
 *   items={[
 *     { id: "1", name: "John Doe" },
 *     { id: "2", name: "Jane Smith", image: "/jane.jpg" },
 *     { id: "3", name: "Bob Wilson" },
 *   ]}
 *   max={2}
 *   size="sm"
 * />
 * ```
 */
export { AvatarGroup };
export type { AvatarGroupItem, AvatarGroupProps };
