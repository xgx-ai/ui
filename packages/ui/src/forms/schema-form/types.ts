import type { JSX } from "@solidjs/web";
import type { Accessor, Component } from "solid-js";
import type { z } from "zod";

export interface FieldMeta {
  type: "string" | "number" | "boolean" | "enum" | "string-array" | "object-array";
  isOptional: boolean;
  /** A text field whose schema accepts an empty string, such as a plain `z.string()`. */
  acceptsEmpty?: boolean;
  defaultValue?: unknown;
  format?: string;
  minimum?: number;
  maximum?: number;
  options?: SelectOption[];
  itemLabel?: string;
  label?: string;
  placeholder?: string;
  rows?: number;
  step?: number;
  inputMode?: "none" | "text" | "decimal" | "numeric" | "tel" | "search" | "email" | "url";
  autocomplete?: string;
  extra?: Record<string, unknown>;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface FieldBinding<T = unknown> {
  name: string;
  value: Accessor<T>;
  onInput: (value: T) => void;
  onBlur: () => void;
  validationState: Accessor<"valid" | "invalid">;
  errorMessage: Accessor<string | undefined>;
  required: boolean;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  options?: SelectOption[];
  minValue?: number;
  maxValue?: number;
  step?: number;
  type?: string;
  rows?: number;
  inputMode?: FieldMeta["inputMode"];
  autocomplete?: string;
}

export interface CreateFormOptions<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Re-validate on every change. Defaults to `true`. */
  validateOnChange?: boolean;
  /** Re-validate when a field blurs; only matters without `validateOnChange`. Defaults to `true`. */
  validateOnBlur?: boolean;
  /**
   * Values merged over the schema defaults; also the clean baseline for `isDirty`. Kept loose
   * because existing callers seed records wider than the schema; `reset(values)` is typed.
   */
  initialValues?: Record<string, unknown>;
  /** Disables every field. Pass an accessor (or a getter) to follow reactive state. */
  disabled?: boolean | Accessor<boolean>;
  /**
   * Schema used for submit validation; defaults to the field schema. Its errors, such as
   * cross-field refinements, are shown from the first submit attempt, and `isValid` reflects it.
   */
  submitSchema?: z.ZodType<T>;
}

export interface FormInstance<T extends Record<string, unknown>, Input = T> {
  field: <K extends keyof T & string>(name: K) => FieldBinding<T[K]>;
  Field: Component<FieldProps>;
  Rest: Component;
  submit: (
    handler: (data: T) => void | Promise<void>,
    onError?: (errors: Record<string, string[]>) => void,
  ) => (e?: Event) => void;
  /**
   * Restores the clean values and clears touched fields and submit errors. With `values`, they
   * are merged over the current baseline, which becomes the new clean state for `isDirty`.
   */
  reset(values?: Partial<Input>): void;
  /** Whether the current values pass submit validation (`submitSchema` when provided). */
  isValid: Accessor<boolean>;
  isDirty: Accessor<boolean>;
  isSubmitting: Accessor<boolean>;
  meta: Record<string, FieldMeta>;
  claimed: Set<string>;
  fieldNames: string[];
}

export interface FieldProps {
  name: string;
  component?: Component<{ binding: FieldBinding }>;
  class?: string;
}

export interface FormProps<T extends Record<string, unknown>, Input = T> {
  form: FormInstance<T, Input>;
  onSubmit: (data: T) => void | Promise<void>;
  onError?: (errors: Record<string, string[]>) => void;
  children?: JSX.Element;
  class?: string;
}
