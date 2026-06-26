import type { Editor } from "@tiptap/core";
import { mergeAttributes, Node } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { NodeView } from "@tiptap/pm/view";
import {
	getParameter,
	getParameterValue,
	isParameterAmbiguous,
	onParameterValuesChange,
	updateParameterValue,
} from "./parameter-store";

function getDisplayValue(paramName: string) {
	const value = getParameterValue(paramName);
	return value && value.trim().length > 0 ? value : `{{${paramName}}}`;
}

function stopEvent(event: Event) {
	event.preventDefault();
	event.stopPropagation();
}

function stopPropagation(event: Event) {
	event.stopPropagation();
}

function getInputWidth(value: string, paramName: string) {
	return `${Math.max(10, value.length, Math.ceil(paramName.length / 1.5))}ch`;
}

export const ParameterNode = Node.create({
	name: "parameter",
	group: "inline",
	inline: true,
	atom: true,

	addAttributes() {
		return {
			paramName: {
				default: null,
				parseHTML: (element: HTMLElement) =>
					element.getAttribute("data-param-name"),
				renderHTML: (attributes: Record<string, unknown>) => ({
					"data-param-name": attributes.paramName,
				}),
			},
		};
	},

	parseHTML() {
		return [{ tag: 'span[data-type="parameter"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			"span",
			mergeAttributes(HTMLAttributes, { "data-type": "parameter" }),
			0,
		];
	},

	addNodeView() {
		return ({
			node,
			editor,
		}: {
			node: ProseMirrorNode;
			editor: Editor;
		}): NodeView => {
			let paramName = node.attrs.paramName as string;
			let isEditing = false;
			let draftValue = getParameterValue(paramName) ?? "";
			let outsidePointerHandler: ((event: PointerEvent) => void) | null = null;

			const dom = document.createElement("span");
			dom.setAttribute("data-type", "parameter");
			dom.setAttribute("data-param-name", paramName);
			dom.contentEditable = "false";
			dom.className = "relative inline-flex align-baseline select-none";

			const trigger = document.createElement("button");
			trigger.type = "button";
			trigger.className =
				"inline-flex items-center rounded-full border px-2.5 py-1 text-sm font-medium transition-colors";
			trigger.setAttribute("aria-label", `Edit parameter ${paramName}`);

			const triggerLabel = document.createElement("span");
			triggerLabel.className = "max-w-[20rem] truncate";
			trigger.append(triggerLabel);

			const popover = document.createElement("span");
			popover.className =
				"absolute left-0 top-full z-20 mt-2 hidden min-w-[16rem] cursor-auto rounded-xl border bg-background p-2 shadow-xl";

			const popoverInner = document.createElement("span");
			popoverInner.className = "flex items-end gap-2";

			const fieldWrapper = document.createElement("span");
			fieldWrapper.className = "flex min-w-0 flex-1 flex-col gap-1";

			const nameLabel = document.createElement("span");
			nameLabel.className =
				"text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground";

			const input = document.createElement("input");
			input.type = "text";
			input.className =
				"h-8 cursor-text rounded-md border bg-background px-2 text-sm transition-colors focus-visible:border-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/30";
			input.setAttribute("aria-label", `Value for parameter ${paramName}`);

			fieldWrapper.append(nameLabel, input);

			const actions = document.createElement("span");
			actions.className = "flex items-center self-end gap-1";

			const saveButton = document.createElement("button");
			saveButton.type = "button";
			saveButton.className =
				"rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-50";
			saveButton.textContent = "Save";

			const cancelButton = document.createElement("button");
			cancelButton.type = "button";
			cancelButton.className =
				"rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
			cancelButton.textContent = "Cancel";

			actions.append(saveButton, cancelButton);
			popoverInner.append(fieldWrapper, actions);
			popover.append(popoverInner);
			dom.append(trigger, popover);

			const detachOutsidePointerHandler = () => {
				if (!outsidePointerHandler) return;
				document.removeEventListener(
					"pointerdown",
					outsidePointerHandler,
					true,
				);
				outsidePointerHandler = null;
			};

			const closeEditor = () => {
				isEditing = false;
				detachOutsidePointerHandler();
				render();
			};

			const save = () => {
				const parameter = getParameter(paramName);
				if (
					!parameter ||
					isParameterAmbiguous(paramName) ||
					!editor.isEditable
				) {
					closeEditor();
					return;
				}

				const nextValue = input.value.trim();
				draftValue = nextValue;

				if (updateParameterValue(paramName, nextValue)) {
					closeEditor();
					return;
				}

				render();
			};

			const openEditor = () => {
				const parameter = getParameter(paramName);
				if (
					!parameter ||
					isParameterAmbiguous(paramName) ||
					!editor.isEditable
				) {
					return;
				}

				draftValue = parameter.value;
				isEditing = true;
				render();

				outsidePointerHandler = (event: PointerEvent) => {
					if (
						event.target instanceof globalThis.Node &&
						dom.contains(event.target)
					) {
						return;
					}
					save();
				};
				document.addEventListener("pointerdown", outsidePointerHandler, true);

				requestAnimationFrame(() => {
					input.focus();
					const inputLength = input.value.length;
					input.setSelectionRange(inputLength, inputLength);
				});
			};

			const render = () => {
				const parameter = getParameter(paramName);
				const ambiguous = isParameterAmbiguous(paramName);
				const missing = !parameter && !ambiguous;
				const editable = editor.isEditable && !!parameter && !ambiguous;

				triggerLabel.textContent = getDisplayValue(paramName);
				trigger.title = ambiguous
					? `${paramName} matches more than one parameter. Edit it from the parameter list.`
					: missing
						? `${paramName} is not defined in this project.`
						: editable
							? `Edit ${paramName}`
							: paramName;
				trigger.disabled = !editable;
				trigger.className = [
					"inline-flex items-center rounded-full border px-2.5 py-1 text-sm font-medium transition-colors",
					editable
						? "cursor-text border-accent/30 bg-accent/10 text-accent-foreground hover:border-accent/50 hover:bg-accent/15"
						: ambiguous
							? "cursor-not-allowed border-amber-300 bg-amber-50 text-amber-900"
							: missing
								? "cursor-not-allowed border-dashed border-border bg-muted/40 text-muted-foreground"
								: "cursor-default border-accent/20 bg-accent/10 text-accent-foreground opacity-80",
				].join(" ");

				popover.classList.toggle("hidden", !isEditing);
				nameLabel.textContent = paramName;
				input.value = draftValue;
				input.style.width = getInputWidth(draftValue, paramName);
				saveButton.disabled = !editable;
			};

			trigger.addEventListener("mousedown", stopEvent);
			trigger.addEventListener("click", openEditor);

			input.addEventListener("mousedown", stopPropagation);
			input.addEventListener("click", stopPropagation);
			input.addEventListener("input", () => {
				draftValue = input.value;
				input.style.width = getInputWidth(draftValue, paramName);
			});
			input.addEventListener("keydown", (event) => {
				event.stopPropagation();
				if (event.key === "Enter") {
					event.preventDefault();
					save();
					return;
				}
				if (event.key === "Escape") {
					event.preventDefault();
					closeEditor();
				}
			});

			saveButton.addEventListener("mousedown", stopEvent);
			saveButton.addEventListener("click", save);

			cancelButton.addEventListener("mousedown", stopEvent);
			cancelButton.addEventListener("click", closeEditor);

			render();
			const unsubscribe = onParameterValuesChange(render);

			return {
				dom,
				update(updatedNode) {
					if (updatedNode.type.name !== "parameter") {
						return false;
					}

					const nextParamName = updatedNode.attrs.paramName as string;
					if (nextParamName !== paramName) {
						paramName = nextParamName;
						dom.setAttribute("data-param-name", paramName);
						trigger.setAttribute("aria-label", `Edit parameter ${paramName}`);
						input.setAttribute(
							"aria-label",
							`Value for parameter ${paramName}`,
						);
						if (!isEditing) {
							draftValue = getParameterValue(paramName) ?? "";
						}
					}

					render();
					return true;
				},
				stopEvent() {
					return true;
				},
				ignoreMutation() {
					return true;
				},
				destroy() {
					detachOutsidePointerHandler();
					unsubscribe();
				},
			};
		};
	},
});
