import { Show } from "solid-js";
import { Callout } from "./callout.tsx";

interface ErrorAlertProps {
  /** The error object to display. If null, nothing is rendered. */
  error?: Error | null;
  /** Direct message string to display */
  message?: string;
  /** Message to display if error.message is empty */
  fallbackMessage?: string;
}

function ErrorAlert(props: ErrorAlertProps) {
  const getMessage = () =>
    props.message ||
    props.error?.message ||
    props.fallbackMessage ||
    "An error occurred";

  return (
    <Show when={props.error || props.message}>
      <Callout variant="error">{getMessage()}</Callout>
    </Show>
  );
}

/**
 * # ErrorAlert
 *
 * Displays an error message in a Callout when an error is present.
 *
 * @example
 * ```
 * <div class="space-y-4">
 *   <ErrorAlert message="Something went wrong!" />
 *   <ErrorAlert
 *     error={new Error("Something went wrong!")}
 *     fallbackMessage="An unexpected error occurred"
 *   />
 * </div>
 * ```
 */
export { ErrorAlert };
export type { ErrorAlertProps };
