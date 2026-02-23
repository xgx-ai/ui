// Re-export TanStack Form primitives for convenience

export type {
  FieldApi,
  FieldMeta,
  FieldOptions,
  FieldState,
  FormApi,
  FormOptions,
  FormState,
} from "@tanstack/solid-form";
export { createField, createForm } from "@tanstack/solid-form";
export type { FieldErrorProps } from "./field-error";
export { FieldError } from "./field-error";
export type { FieldLabelProps } from "./field-label";
// Field components
export { FieldLabel } from "./field-label";
export type { FormGroupContainerProps, FormGroupProps } from "./form-group";
// Form group components
export { FormGroup, FormGroupContainer, useFieldRequired } from "./form-group";
export type { FormNumberFieldProps } from "./form-number-field";
export { FormNumberField } from "./form-number-field";
export type { FormSearchFieldProps, SearchOption } from "./form-search-field";
export { FormSearchField } from "./form-search-field";
export type { FormSelectFieldProps, SelectOption } from "./form-select-field";
export { FormSelectField } from "./form-select-field";
export type {
  CreateDialogProps,
  FormSelectFieldWithCreateProps,
} from "./form-select-field-with-create";
export { FormSelectFieldWithCreate } from "./form-select-field-with-create";
export type { FormTextFieldProps } from "./form-text-field";
// Form field components
export { FormTextField } from "./form-text-field";
export type { FormTextareaFieldProps } from "./form-textarea-field";
export { FormTextareaField } from "./form-textarea-field";
// Types
export type {
  AnyFieldApi,
  AnyFormApi,
  BaseFieldProps,
  FormGroupValidation,
  ValidationState,
} from "./types";

// Validation utilities
// Note: For most use cases, prefer form-level Zod schema validation
// by passing the schema directly to `validators.onChange` in createForm
export { compose, zodFieldValidator } from "./validation";
