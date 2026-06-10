import type { JSX } from "@solidjs/web";
import type { Accessor, Component } from "solid-js";

export interface FieldMeta {
  type: "string" | "number" | "boolean" | "enum" | "string-array" | "object-array";
  isOptional: boolean;
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

export interface CreateFormOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  initialValues?: Record<string, unknown>;
  disabled?: boolean;
}

export interface FormInstance<T extends Record<string, unknown>> {
  field: <K extends keyof T & string>(name: K) => FieldBinding<T[K]>;
  Field: Component<FieldProps>;
  Rest: Component;
  submit: (
    handler: (data: T) => void | Promise<void>,
    onError?: (errors: Record<string, string[]>) => void,
  ) => (e?: Event) => void;
  reset: () => void;
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

export interface FormProps<T extends Record<string, unknown>> {
  form: FormInstance<T>;
  onSubmit: (data: T) => void | Promise<void>;
  onError?: (errors: Record<string, string[]>) => void;
  children?: JSX.Element;
  class?: string;
}
