import type { z } from "zod";

/**
 * Creates a TanStack Form validator from a Zod schema.
 * This is primarily useful for field-level validation when you want
 * to validate a single field independently.
 *
 * For most use cases, prefer form-level validation by passing
 * the Zod schema directly to `validators.onChange` in createForm.
 *
 * @example
 * ```tsx
 * // Field-level validation (use sparingly)
 * const emailSchema = z.string().email("Invalid email");
 *
 * <FormTextField
 *   form={form}
 *   name="email"
 *   validators={{
 *     onBlur: zodFieldValidator(emailSchema),
 *   }}
 * />
 *
 * // Preferred: Form-level validation
 * const formSchema = z.object({
 *   email: z.string().email("Invalid email"),
 *   name: z.string().min(1, "Required"),
 * });
 *
 * const form = createForm(() => ({
 *   validators: { onChange: formSchema },
 *   ...
 * }));
 * ```
 */
export function zodFieldValidator<T extends z.ZodType>(schema: T) {
  return ({ value }: { value: z.infer<T> }) => {
    const result = schema.safeParse(value);
    if (!result.success) {
      return result.error.issues[0]?.message;
    }
    return undefined;
  };
}

/**
 * Combines multiple validators into one.
 * Returns the first error message encountered.
 *
 * This is useful when you need to combine multiple field-level validators.
 * For most use cases, prefer form-level Zod schema validation instead.
 *
 * @example
 * ```tsx
 * <FormTextField
 *   form={form}
 *   name="password"
 *   validators={{
 *     onBlur: compose(
 *       zodFieldValidator(z.string().min(8)),
 *       zodFieldValidator(z.string().regex(/[A-Z]/, "Must contain uppercase")),
 *     ),
 *   }}
 * />
 * ```
 */
export function compose<T>(
  ...validators: Array<(ctx: { value: T }) => string | undefined>
) {
  return (ctx: { value: T }) => {
    for (const validator of validators) {
      const error = validator(ctx);
      if (error) return error;
    }
    return undefined;
  };
}
