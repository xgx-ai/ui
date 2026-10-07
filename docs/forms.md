# Forms

## Schema forms

`createForm(schema, options)` from `@xgx/ui` (or `@xgx/ui/schema-form`) derives form state from a
Zod object schema. `form.Field`, `form.Rest` and `<Form>` render it.

| Option | Default | Behaviour |
| --- | --- | --- |
| `initialValues` | `{}` | Merged over schema defaults; also the clean baseline for `isDirty`. |
| `validateOnChange` | `true` | Errors follow every change. |
| `validateOnBlur` | `true` | Without `validateOnChange`, errors refresh when a field blurs. |
| `submitSchema` | field schema | Validates submit, for example cross-field refinements. |
| `disabled` | `false` | A boolean, an accessor or a getter; bindings follow it. |

Validation is derived from the values, never stored. A field shows its first error once touched
(blurred, or every field after a submit attempt).

- `isValid()` is whether submit validation would pass, so it accounts for `submitSchema`.
- `submitSchema` errors appear from the first submit attempt and clear as soon as the values
  satisfy them. Editing an unrelated field leaves them in place.
- Messages declared on the schema win (`z.string().min(3, "Give a short reason")`,
  `z.string({ error: "Choose an activity" })`). Other issues are humanised from the field's
  `.describe()` label, such as "Activity is required" for a cleared field or "Count must be a
  number". An application-wide `z.config({ customError })` still applies to the issues it handles.

`reset(values?)` restores the clean values and clears touched fields and submit errors. With
`values`, typed as the schema input, they are merged over the current baseline, which becomes the
new clean state. Use it for data that loads after the form was created:

```tsx
const form = createForm(profileSchema, { disabled: () => !session() });

createEffect(
  () => session(),
  (current) => {
    if (current) form.reset({ name: current.name, email: current.email });
  },
);
```

## Controlled text fields

A `TextField` or `TextFieldInput`/`TextFieldTextArea` with `value` is controlled. When a handler
normalises input back to the current value, such as trimming a leading space into an empty field,
the value does not change, so the element keeps the typed text until the next accepted change or
until the field blurs, when it shows the controlled value again. Reconciling on every keystroke
would discard input for values that update asynchronously, such as router-bound filters.
