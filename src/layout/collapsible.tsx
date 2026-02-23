import * as CollapsiblePrimitive from "@kobalte/core/collapsible";

/**
 * # Collapsible
 *
 * Expandable/collapsible content section.
 *
 * @example
 * ```
 * <Collapsible class="w-64 space-y-2">
 *   <CollapsibleTrigger class="flex items-center justify-between w-full px-4 py-2 rounded bg-muted">
 *     <span>Click to expand</span>
 *   </CollapsibleTrigger>
 *   <CollapsibleContent class="px-4 py-2 border rounded">
 *     <p>Hidden content revealed!</p>
 *   </CollapsibleContent>
 * </Collapsible>
 * ```
 */
const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = CollapsiblePrimitive.Trigger;

const CollapsibleContent = CollapsiblePrimitive.Content;

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
