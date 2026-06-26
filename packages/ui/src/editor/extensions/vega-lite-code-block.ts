import { mergeAttributes, Node } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";
import type { EditorView, NodeView } from "@tiptap/pm/view";
const DRAG_HANDLE_SVG =
	'<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>';

const AMA_CHART_PALETTE = [
	"#7AF17A",
	"#48C96D",
	"#BDF7C1",
	"#141313",
	"#6F7D6F",
	"#A3ACA3",
];
const AMA_CHART_CHARCOAL = "#141313";
const AMA_CHART_GRID = "#DCE8DE";
const AMA_CHART_AXIS = "#A3ACA3";

function isRecord(value: unknown): value is Record<string, any> {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

function getMarkType(mark: unknown): string | null {
	if (typeof mark === "string") return mark;
	if (isRecord(mark) && typeof mark.type === "string") return mark.type;
	return null;
}

function getDefaultMarkColor(mark: unknown) {
	const type = getMarkType(mark);
	if (type === "line" || type === "rule" || type === "trail") {
		return AMA_CHART_CHARCOAL;
	}
	return AMA_CHART_PALETTE[0];
}

function hasExplicitMarkColor(mark: unknown) {
	if (!isRecord(mark)) return false;
	return (
		typeof mark.color === "string" ||
		typeof mark.fill === "string" ||
		typeof mark.stroke === "string"
	);
}

function themeMark(mark: unknown, hasColourEncoding: boolean) {
	if (hasColourEncoding || hasExplicitMarkColor(mark)) return mark;

	const color = getDefaultMarkColor(mark);
	if (typeof mark === "string") {
		return { type: mark, color };
	}
	if (isRecord(mark)) {
		return { ...mark, color };
	}
	return mark;
}

function themeEncoding(encoding: unknown) {
	if (!isRecord(encoding)) return encoding;

	const next = { ...encoding };
	const color = next.color;

	if (isRecord(color)) {
		if (typeof color.value === "string") {
			next.color = color;
		} else {
			const scale = isRecord(color.scale) ? color.scale : {};
			const hasExplicitRange =
				Array.isArray(scale.range) && scale.range.length > 0;
			next.color = {
				...color,
				scale: {
					...scale,
					range: hasExplicitRange ? scale.range : AMA_CHART_PALETTE,
				},
			};
		}
	}

	return next;
}

function themeConfig(config: unknown) {
	const existing = isRecord(config) ? config : {};
	const range = isRecord(existing.range) ? existing.range : {};
	return {
		...existing,
		range: {
			...range,
			category: Array.isArray(range.category)
				? range.category
				: AMA_CHART_PALETTE,
			ordinal: Array.isArray(range.ordinal) ? range.ordinal : AMA_CHART_PALETTE,
		},
		axis: {
			domainColor: AMA_CHART_AXIS,
			gridColor: AMA_CHART_GRID,
			labelColor: AMA_CHART_CHARCOAL,
			tickColor: AMA_CHART_AXIS,
			titleColor: AMA_CHART_CHARCOAL,
			...(isRecord(existing.axis) ? existing.axis : {}),
		},
		legend: {
			labelColor: AMA_CHART_CHARCOAL,
			titleColor: AMA_CHART_CHARCOAL,
			...(isRecord(existing.legend) ? existing.legend : {}),
		},
		title: {
			color: AMA_CHART_CHARCOAL,
			fontWeight: 700,
			...(isRecord(existing.title) ? existing.title : {}),
		},
		view: {
			stroke: "transparent",
			...(isRecord(existing.view) ? existing.view : {}),
		},
	};
}

function applyAmaChartTheme(spec: Record<string, unknown>): Record<string, unknown> {
	const encoding = themeEncoding(spec.encoding);
	const next: Record<string, unknown> = {
		...spec,
		encoding,
		config: themeConfig(spec.config),
	};

	if ("mark" in spec) {
		next.mark = themeMark(
			spec.mark,
			isRecord(encoding) && isRecord(encoding.color),
		);
	}

	if (Array.isArray(spec.layer)) {
		next.layer = spec.layer.map((layer) =>
			isRecord(layer) ? applyAmaChartTheme(layer) : layer,
		);
	}

	return next;
}

function findDirectBlockElementAtPoint(
	view: EditorView,
	clientX: number,
	clientY: number,
) {
	let element = document.elementFromPoint(clientX, clientY);
	if (!(element instanceof HTMLElement)) {
		return null;
	}

	if (!view.dom.contains(element)) {
		return null;
	}

	while (
		element &&
		element.parentElement instanceof HTMLElement &&
		element.parentElement !== view.dom
	) {
		element = element.parentElement;
	}

	return element.parentElement === view.dom ? element : null;
}

function resolveDropTarget(
	view: EditorView,
	clientX: number,
	clientY: number,
) {
	const targetBlock = findDirectBlockElementAtPoint(view, clientX, clientY);
	if (!targetBlock) {
		return null;
	}

	const insidePos = view.posAtDOM(targetBlock, 0);
	const $inside = view.state.doc.resolve(insidePos);
	const blockStart = $inside.before($inside.depth);
	const blockNode = view.state.doc.nodeAt(blockStart);
	if (!blockNode) {
		return null;
	}

	const rect = targetBlock.getBoundingClientRect();
	const insertBefore = clientY < rect.top + rect.height / 2;

	return {
		insertPos: insertBefore ? blockStart : blockStart + blockNode.nodeSize,
		left: rect.left,
		top: insertBefore ? rect.top : rect.bottom,
		width: rect.width,
	};
}

function moveNodeToPosition(
	view: EditorView,
	getPos: () => number | undefined,
	insertPos: number,
) {
	const currentPos = getPos();
	if (currentPos == null) return;

	const { state } = view;
	const chartNode = state.doc.nodeAt(currentPos);
	if (!chartNode) return;

	if (
		insertPos >= currentPos &&
		insertPos <= currentPos + chartNode.nodeSize
	) {
		return;
	}

	const tr = state.tr.delete(currentPos, currentPos + chartNode.nodeSize);
	const adjustedInsertPos =
		insertPos > currentPos ? insertPos - chartNode.nodeSize : insertPos;

	tr.insert(adjustedInsertPos, chartNode);
	tr.setSelection(NodeSelection.create(tr.doc, adjustedInsertPos));
	view.dispatch(tr.scrollIntoView());
}

export const VegaLiteChart = Node.create({
	name: "vegaLiteChart",
	group: "block",
	atom: true,
	draggable: true,
	selectable: true,

	addAttributes() {
		return {
			spec: {
				default: "{}",
				parseHTML: (element: HTMLElement) =>
					element.getAttribute("data-spec"),
				renderHTML: (attributes: Record<string, unknown>) => ({
					"data-spec": attributes.spec,
				}),
			},
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-type="vega-lite-chart"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			"div",
			mergeAttributes(HTMLAttributes, { "data-type": "vega-lite-chart" }),
			0,
		];
	},

	addNodeView() {
		return ({ node, view, getPos }: { node: ProseMirrorNode; view: EditorView; getPos: () => number | undefined }): NodeView => {
			let currentNode = node;
			let renderRun = 0;
			let currentResult: { finalize: () => void } | null = null;

			const wrapper = document.createElement("div");
			wrapper.className = "vega-lite-chart my-4 relative group/chart";
			wrapper.contentEditable = "false";
			wrapper.draggable = false;

			const controls = document.createElement("div");
			controls.className =
				"absolute -left-10 top-4 flex items-center opacity-0 group-hover/chart:opacity-100 transition-opacity duration-150";
			controls.contentEditable = "false";

			const dragHandle = document.createElement("button");
			dragHandle.type = "button";
			dragHandle.title = "Drag chart";
			dragHandle.className =
				"flex cursor-grab active:cursor-grabbing items-center justify-center size-7 rounded border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-sm";
			dragHandle.innerHTML = DRAG_HANDLE_SVG;
			dragHandle.contentEditable = "false";
			dragHandle.draggable = false;
			dragHandle.setAttribute("data-drag-handle", "true");

			controls.append(dragHandle);

			const chart = document.createElement("div");
			chart.className = "overflow-auto w-full [&>div]:w-full [&_svg]:w-full [&_svg]:h-auto [&_*]:!cursor-pointer";

			const error = document.createElement("div");
			error.className =
				"hidden text-sm text-muted-foreground italic py-2";

			wrapper.append(controls, chart, error);

			const dropIndicator = document.createElement("div");
			dropIndicator.className =
				"pointer-events-none fixed z-[80] hidden h-0.5 -translate-y-1/2 rounded-full bg-foreground";

			const dropIndicatorDot = document.createElement("div");
			dropIndicatorDot.className =
				"absolute left-0 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground";
			dropIndicator.append(dropIndicatorDot);
			document.body.append(dropIndicator);

			let debounceTimer: ReturnType<typeof setTimeout> | null = null;

			const renderChartImmediate = async () => {
				const thisRun = ++renderRun;
				const raw = (currentNode.attrs.spec as string) ?? "";

				error.classList.add("hidden");
				error.textContent = "";

				if (!raw || raw === "{}") {
					chart.innerHTML = "";
					error.textContent = "This chart block has no spec.";
					error.classList.remove("hidden");
					return;
				}

				let spec: Record<string, unknown>;
				try {
					spec = JSON.parse(raw) as Record<string, unknown>;
				} catch (e) {
					chart.innerHTML = "";
					error.textContent =
						e instanceof Error
							? `Invalid JSON: ${e.message}`
							: "Invalid JSON.";
					error.classList.remove("hidden");
					return;
				}

				try {
					const vegaEmbed = await import("vega-embed");
					if (thisRun !== renderRun) return;

					const result = await vegaEmbed.default(
						chart,
						{ ...applyAmaChartTheme(spec), width: "container" } as any,
						{
							actions: false,
							renderer: "svg",
						},
					);

					if (thisRun !== renderRun) {
						result.finalize();
						return;
					}

					currentResult?.finalize();
					currentResult = result;
				} catch (e) {
					if (thisRun !== renderRun) return;
					chart.innerHTML = "";
					error.textContent =
						e instanceof Error
							? `Chart render failed: ${e.message}`
							: "Chart render failed.";
					error.classList.remove("hidden");
				}
			};

			const renderChart = (immediate?: boolean) => {
				if (debounceTimer) clearTimeout(debounceTimer);
				if (immediate) {
					void renderChartImmediate();
				} else {
					debounceTimer = setTimeout(() => void renderChartImmediate(), 150);
				}
			};

			renderChart(true);

			const selectThisNode = () => {
				const pos = getPos();
				if (pos == null) return;
				const tr = view.state.tr.setSelection(
					NodeSelection.create(view.state.doc, pos),
				);
				view.dispatch(tr);
			};

			dragHandle.addEventListener("mousedown", (event) => {
				event.preventDefault();
				selectThisNode();
			});

			let pointerTracking:
				| {
						pointerId: number;
						startX: number;
						startY: number;
						didDrag: boolean;
						dropTarget: { insertPos: number } | null;
				  }
				| null = null;

			const hideDropIndicator = () => {
				dropIndicator.classList.add("hidden");
			};

			const showDropIndicator = (target: {
				left: number;
				top: number;
				width: number;
			}) => {
				dropIndicator.classList.remove("hidden");
				dropIndicator.style.left = `${target.left}px`;
				dropIndicator.style.top = `${target.top}px`;
				dropIndicator.style.width = `${target.width}px`;
			};

			const clearDraggingState = () => {
				wrapper.classList.remove("opacity-70");
				document.body.classList.remove("cursor-grabbing");
				hideDropIndicator();
			};

			const handlePointerMove = (event: PointerEvent) => {
				if (!pointerTracking || event.pointerId !== pointerTracking.pointerId) {
					return;
				}

				const moveX = Math.abs(event.clientX - pointerTracking.startX);
				const moveY = Math.abs(event.clientY - pointerTracking.startY);
				if (!pointerTracking.didDrag && moveX + moveY < 6) {
					return;
				}

				pointerTracking.didDrag = true;
				wrapper.classList.add("opacity-70");
				document.body.classList.add("cursor-grabbing");
				const dropTarget = resolveDropTarget(view, event.clientX, event.clientY);
				pointerTracking.dropTarget = dropTarget
					? { insertPos: dropTarget.insertPos }
					: null;
				if (dropTarget) {
					showDropIndicator(dropTarget);
				} else {
					hideDropIndicator();
				}
				event.preventDefault();
			};

			const finishPointerDrag = (event: PointerEvent) => {
				if (!pointerTracking || event.pointerId !== pointerTracking.pointerId) {
					return;
				}

				dragHandle.releasePointerCapture(event.pointerId);

				const didDrag = pointerTracking.didDrag;
				const storedDropTarget = pointerTracking.dropTarget;
				pointerTracking = null;
				clearDraggingState();

				if (!didDrag) {
					return;
				}

				const dropTarget =
					storedDropTarget ??
					resolveDropTarget(view, event.clientX, event.clientY);
				if (!dropTarget) {
					return;
				}

				moveNodeToPosition(view, getPos, dropTarget.insertPos);
			};

			dragHandle.addEventListener("pointerdown", (event) => {
				event.preventDefault();
				selectThisNode();
				pointerTracking = {
					pointerId: event.pointerId,
					startX: event.clientX,
					startY: event.clientY,
					didDrag: false,
					dropTarget: null,
				};
				dragHandle.setPointerCapture(event.pointerId);
			});

			dragHandle.addEventListener("pointermove", handlePointerMove);
			dragHandle.addEventListener("pointerup", finishPointerDrag);
			dragHandle.addEventListener("pointercancel", finishPointerDrag);

			return {
				dom: wrapper,
				stopEvent(event) {
					if (
						event.target === dragHandle ||
						dragHandle.contains(event.target as globalThis.Node)
					) {
						return false;
					}

					if (
						event.type === "mousedown" &&
						(event.target === chart || chart.contains(event.target as globalThis.Node))
					) {
						selectThisNode();
						return true;
					}

					return false;
				},
				update(updatedNode) {
					if (updatedNode.type.name !== currentNode.type.name) {
						return false;
					}
					currentNode = updatedNode;
					renderChart();
					return true;
				},
				selectNode() {
					wrapper.classList.add("ring-2", "ring-primary/30");
				},
				deselectNode() {
					wrapper.classList.remove("ring-2", "ring-primary/30");
				},
				destroy() {
					renderRun += 1;
					if (debounceTimer) clearTimeout(debounceTimer);
					currentResult?.finalize();
					currentResult = null;
					clearDraggingState();
					dropIndicator.remove();
				},
			};
		};
	},
});
