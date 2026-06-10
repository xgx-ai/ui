import { Show } from "solid-js";
import type { z } from "zod";
import { cn } from "../../cn.ts";
import { createAutoField } from "./auto-field.tsx";
import { createForm as createFormCore } from "./create-form.ts";
import { createRest } from "./rest.tsx";
import type { CreateFormOptions, FormInstance, FormProps } from "./types.ts";

export function createForm<Schema extends z.ZodType<Record<string, unknown>>>(
  schema: Schema,
  options?: CreateFormOptions,
): FormInstance<z.output<Schema>> {
  type FormValues = z.output<Schema>;
  const form = createFormCore<FormValues>(schema as unknown as z.ZodType<FormValues>, options);
  form.Field = createAutoField(form);
  form.Rest = createRest(form);
  return form;
}

/**
 * Renders a schema-form element bound to a FormInstance.
 *
 * Best used with createForm so validation, automatic fields and explicit custom field layouts share one source of truth.
 */
export function Form<T extends Record<string, unknown>>(props: FormProps<T>) {
  return (
    <form
      onSubmit={(event: Event) => props.form.submit(props.onSubmit, props.onError)(event)}
      class={cn("flex flex-col gap-4", props.class)}
    >
      <Show when={props.children} fallback={<props.form.Rest />}>
        {props.children}
      </Show>
    </form>
  );
}
