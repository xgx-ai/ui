import type {
  AnyFieldApi as CoreAnyFieldApi,
  SolidFormExtendedApi,
} from "@tanstack/solid-form";

export type AnyFieldApi = CoreAnyFieldApi;
export type AnyFormApi = SolidFormExtendedApi<
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
> &
  Record<string, any>;

/**
 * Base props for all form field components
 */
export interface BaseFieldProps {
  /** Label text displayed above the field */
  label?: string;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Description text displayed below the label */
  description?: string;
  /** Whether the field is required (visual indicator only when using form-level validation) */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is read-only */
  readOnly?: boolean;
  /** Additional CSS class for the field container */
  class?: string;
}

/**
 * Validation state for form groups
 */
export type ValidationState = "pending" | "valid" | "invalid" | "warning";

/**
 * Props for FormGroup validation tracking
 */
export interface FormGroupValidation {
  /** List of field names to track for validation */
  fields: string[];
  /** Whether to show warning state when fields are empty */
  showWarningWhenEmpty?: boolean;
}
