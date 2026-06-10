import type { JSX } from "@solidjs/web";
import { Button } from "./button";
import { CirclePlus } from "../icons.index";
import { createMemo, Show } from "solid-js";

type OptionalObjectFieldApi = {
  state: {
    value: unknown;
  };
  handleChange: (...args: any[]) => void;
};

interface OptionalObjectFieldProps<T extends Record<string, any>> {
  field: OptionalObjectFieldApi;
  label: string;
  defaultValue: T;
  children: JSX.Element;
  description?: string;
}

/**
 * A reusable component for handling optional object fields in forms.
 * Allows users to add/remove an optional object without triggering validation errors.
 *
 * @example
 * ```tsx
 * <form.Field name="address">
 *   {(field) => (
 *     <OptionalObjectField
 *       field={field()}
 *       label="Address"
 *       defaultValue={{
 *         addressLine1: "",
 *         addressLine2: "",
 *         city: "",
 *         postcode: "",
 *         region: "",
 *         country: "",
 *       }}
 *     >
 *       // Nested field components here
 *     </OptionalObjectField>
 *   )}
 * </form.Field>
 * ```
 */
export default function OptionalObjectField<T extends Record<string, any>>(
  props: OptionalObjectFieldProps<T>,
) {
  const hasValue = createMemo(() => {
    const value = props.field.state.value;
    return value != null && value !== undefined;
  });

  const handleAdd = () => {
    props.field.handleChange(props.defaultValue);
  };

  const handleRemove = () => {
    props.field.handleChange(undefined as any);
  };

  return (
    <div class="flex flex-col gap-2">
      <div class="flex flex-col gap-2">
        <div class="flex flex-col gap-1">
          <div class="text-sm font-semibold">{props.label}</div>
          {props.description && (
            <div class="text-xs text-muted-foreground">{props.description}</div>
          )}
        </div>
        <Show when={!hasValue()}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
            class="flex items-center gap-1 w-full"
          >
            <CirclePlus class="w-4 h-4" />
            Add {props.label}
          </Button>
        </Show>
      </div>

      <Show when={hasValue()}>
        <div class="flex flex-col gap-2 pl-2 pt-2">{props.children}</div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRemove}
          class="flex items-center gap-1 text-danger hover:bg-danger hover:text-danger-foreground"
        >
          Remove {props.label}
        </Button>
      </Show>
    </div>
  );
}
