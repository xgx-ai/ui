/**
 * Tailwind class presets for drag and drop animations
 */

/** Classes applied to an element while it's being dragged */
export const draggingClasses = "scale-105 shadow-xl opacity-90 cursor-grabbing";

/** Classes applied to an element when it's the original position during drag */
export const draggingSourceClasses = "opacity-40";

/** Classes applied to a valid drop target when a draggable is over it */
export const dropTargetClasses = "ring-2 ring-primary ring-offset-2";

/** Classes for the drop indicator line */
export const dropIndicatorClasses =
  "bg-primary rounded-full transition-all duration-150";

/** Classes for the drop indicator when horizontal (between items in a row) */
export const dropIndicatorHorizontalClasses = "w-0.5 h-full";

/** Classes for the drop indicator when vertical (between items in a column) */
export const dropIndicatorVerticalClasses = "h-0.5 w-full";

/** Classes for the drag preview overlay */
export const dragPreviewClasses =
  "fixed pointer-events-none z-[9999] shadow-2xl rounded-lg";

/** Transition classes for smooth reordering animations */
export const reorderTransitionClasses =
  "transition-transform duration-200 ease-out";

/** Classes for the file dropzone in normal state */
export const dropzoneClasses =
  "border-2 border-dashed border-muted-foreground/25 rounded-lg transition-colors duration-200";

/** Classes for the file dropzone when a file is being dragged over */
export const dropzoneActiveClasses = "border-primary bg-primary/5 border-solid";

/** Classes for disabled drag elements */
export const disabledClasses = "opacity-50 cursor-not-allowed";

/**
 * Animation duration in milliseconds for various transitions
 */
export const animationDurations = {
  fast: 150,
  normal: 200,
  slow: 300,
} as const;

/**
 * Easing functions for animations
 */
export const easings = {
  easeOut: "cubic-bezier(0.33, 1, 0.68, 1)",
  easeInOut: "cubic-bezier(0.65, 0, 0.35, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;
