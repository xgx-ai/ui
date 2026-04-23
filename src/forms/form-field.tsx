import type { TextFieldInputProps } from "./text-field";
import {
  type Component,
  createMemo,
  createUniqueId,
  type JSX,
  Match,
  Show,
  Switch,
  splitProps,
} from "solid-js";
import { ZodArray, ZodDefault, ZodNullable, ZodObject, ZodOptional } from "zod";
import { FieldLabel } from "./form-components/field-label";
import { TextFieldForm } from "./form-components/text-field-form";

type FormFieldApi = {
  name: string;
  state: {
    value: unknown;
    meta: {
      isTouched?: boolean;
      isValidating?: boolean;
      errors?: Array<{ message?: string } | string | undefined>;
    };
  };
  handleChange: (...args: any[]) => void;
  handleBlur: (...args: any[]) => void;
};

type FormFieldProps = {
  field: FormFieldApi;
  label: string;
  placeholder?: string;
  type?:
    | TextFieldInputProps["type"]
    | "textarea"
    | "select"
    | "tags"
    | "tiptap";
  prefix?: string | JSX.Element | Component;
  suffix?: string;
  options?: { value: string; label: string }[];
  autocomplete?: string;
  class?: string;
  disabled?: boolean;
  height?: string;
  onChange?: (e: any) => void;
  onInputChange?: (value: string) => void;
  notRequired?: boolean;
  dataInteractive?: boolean;
  schema?: any;
  dynamicError?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  inputMode?:
    | "none"
    | "text"
    | "decimal"
    | "numeric"
    | "tel"
    | "search"
    | "email"
    | "url";
  description?: string;
};

/**
 * Helper function to traverse a Zod schema and extract the schema at a given path
 */
function getZodSchemaAtPath(schema: any, path: string): any {
  // e.g. "address.city" -> ["address", "city"]
  const parts = path.match(/[^.[\]]+/g) || [];
  let current = schema;

  for (let i = 0; i < parts.length; i++) {
    const key = parts[i];

    // Unwrap optionals, defaults, or nullables to get to the core schema
    while (
      current instanceof ZodOptional ||
      current instanceof ZodDefault ||
      current instanceof ZodNullable
    ) {
      current = current.unwrap();
    }

    // If the current schema is an object, find the property with the current key
    if (current instanceof ZodObject) {
      const shape = current.shape as Record<string, any>;
      if (!(key in shape)) {
        throw new Error(`Path error: No schema key "${key}" in object.`);
      }
      current = shape[key];
    } // If the current schema is an array, we expect the key to be a number
    else if (current instanceof ZodArray) {
      if (isNaN(parseInt(key, 10))) {
        throw new Error(
          `Path error: Expected a numeric index for array, but got "${key}".`,
        );
      }
      current = current.element;
    } // If it's neither an object nor an array, we cannot go deeper
    else {
      throw new Error(
        `Path error: Cannot descend into schema at key "${key}".`,
      );
    }
  }

  return current;
}

/**
 * Reusable FormField component that automatically detects if a field is required
 * based on the Zod schema definition
 */
export default function FormField(props: FormFieldProps) {
  const [local] = splitProps(props, [
    "field",
    "label",
    "placeholder",
    "prefix",
    "suffix",
    "autocomplete",
    "class",
    "disabled",
    "schema",
    "min",
    "max",
    "step",
    "inputMode",
    "description",
  ]);

  const isRequired = createMemo(() => {
    if (props.notRequired) return false;

    // If we have a schema, check if undefined is valid
    if (local.schema) {
      const fieldPath = local.field.name as string;
      try {
        const fieldSchema = getZodSchemaAtPath(local.schema, fieldPath);
        return !fieldSchema.safeParse(undefined).success;
      } catch (e) {
        // If we can't parse the path, assume not required
        console.warn(
          `Could not determine if field ${fieldPath} is required:`,
          e,
        );
        return false;
      }
    }

    return false;
  });

  const errors = createMemo(() => {
    const fieldState = local.field.state;
    // Show dynamic error if available, otherwise show onChange errors
    if (props.dynamicError) {
      return [props.dynamicError];
    }
    return (fieldState.meta.isTouched || fieldState.meta.isValidating) &&
      fieldState.meta.errors?.length
      ? fieldState.meta.errors?.map((error: any) => error?.message)
      : undefined;
  });

  return (
    <Switch
      fallback={
        <TextFieldForm
          disabled={local.disabled}
          class={local.class}
          autocomplete={local.autocomplete}
          dataId={local.field.name as string}
          type={(() => {
            // Only pass through native text-field input types; map unsupported ones to 'text'
            const t = props.type;
            if (!t) return "text";
            if (
              t === "textarea" ||
              t === "select" ||
              t === "tags" ||
              t === "tiptap" ||
              t === "checkbox"
            ) {
              return "text";
            }
            return t as TextFieldInputProps["type"];
          })()}
          prefix={local.prefix as string}
          suffix={local.suffix}
          label={local.label}
          required={isRequired()}
          placeholder={local.placeholder}
          value={(local.field.state.value as string | number) ?? ""}
          onChange={(e) => {
            let value = e;
            if (props.type === "number") {
              value = Number(e) as any;
            }
            local.field.handleChange(value);
            props.onChange?.(value);
          }}
          min={local.min}
          max={local.max}
          step={local.step}
          inputMode={local.inputMode}
          onBlur={() => local.field.handleBlur()}
          error={errors()?.join(", ")}
          description={local.description}
        />
      }
    >
      <Match when={props.type === "checkbox"}>
        <label class={`flex items-center gap-2 ${local.class || ""}`}>
          <input
            id={createUniqueId()}
            type="checkbox"
            class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            checked={!!local.field.state.value}
            onChange={(e) => {
              local.field.handleChange(e.currentTarget.checked);
              props.onChange?.(e.currentTarget.checked);
            }}
            onBlur={() => local.field.handleBlur()}
            disabled={local.disabled}
          />
          <div class="flex flex-col">
            <span class="text-sm">
              {local.label}
              {isRequired() && <span class="text-red-500 ml-1">*</span>}
            </span>
            <Show when={local.description}>
              <p class="text-[10px] text-gray-500">{local.description}</p>
            </Show>
          </div>
          {errors() && (
            <span class="ml-2 text-xs text-red-500">
              {errors()!.join(", ")}
            </span>
          )}
        </label>
      </Match>
      <Match when={props.type === "textarea"}>
        <div class="flex flex-col gap-2">
          <FieldLabel required={isRequired()}>{local.label}</FieldLabel>
          <Show when={local.description}>
            <p class="text-[10px] text-gray-500">{local.description}</p>
          </Show>
          <textarea
            id={createUniqueId()}
            class={`w-full p-2 border border-gray-200 rounded-lg bg-white text-xs ${
              props.height || "h-32"
            } ${local.class || ""}`}
            placeholder={local.placeholder}
            value={(local.field.state.value as string) ?? ""}
            onInput={(e) => {
              local.field.handleChange(e.currentTarget.value);
              props.onChange?.(e.currentTarget.value);
            }}
            onBlur={() => local.field.handleBlur()}
            disabled={local.disabled}
          />
          {errors() && <div class="text-sm text-red-500">{errors()}</div>}
        </div>
      </Match>
      <Match when={props.type === "select"}>
        <div class="flex flex-col gap-2 text-xs">
          <FieldLabel required={isRequired()}>{local.label}</FieldLabel>
          <Show when={local.description}>
            <p class="text-[10px] text-gray-500">{local.description}</p>
          </Show>
          <select
            id={createUniqueId()}
            class={`w-full p-2 border border-gray-200 rounded-lg bg-white text-xs ${
              local.class || ""
            }`}
            value={(local.field.state.value as string) ?? ""}
            onChange={(e) => {
              local.field.handleChange(e.currentTarget.value);
              props.onChange?.(e.currentTarget.value);
            }}
            onBlur={() => local.field.handleBlur()}
            disabled={local.disabled}
          >
            <option value="">{local.placeholder ?? "Select an option"}</option>
            {props.options?.map((option) => (
              <option value={option.value}>{option.label}</option>
            ))}
          </select>
          {errors() && <div class="text-xs text-red-500">{errors()}</div>}
        </div>
      </Match>
    </Switch>
  );
}
