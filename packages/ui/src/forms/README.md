# Form Components

Use the schema-form system for product forms.

`createForm`, `Form`, `form.Field` and `form.Rest` should be the default way to
build any form that collects, validates and submits user data. Define the form
contract with a Zod schema, then let schema-form derive labels, required state,
validation messages, default values, input metadata and submitted values from
that schema.

Prefer this:

```tsx
const profileSchema = z.object({
  firstName: z.string().min(1).describe("First name"),
  email: z.string().email().describe("Email address"),
  notes: z.string().describe("Notes").meta({ rows: 3 }).optional(),
});

function ProfileForm() {
  const profileForm = createForm(profileSchema);

  return (
    <Form form={profileForm} onSubmit={saveProfile}>
      <profileForm.Field name="firstName" />
      <profileForm.Field name="email" />
      <profileForm.Field name="notes" />
      <Button type="submit">Save</Button>
    </Form>
  );
}
```

Do not hand-build ordinary product forms from `TextField`, `SelectDropdown`,
`Checkbox`, `SwitchPreset` or similar primitives when a Zod schema can describe
the data. Hand-built fields drift from validation rules, miss required markers,
duplicate labels and make submitted values harder to trust.

Use low-level form controls only for:

- Standalone controls that are not submitted as a form, such as search bars,
  filters, toolbar settings, toggles, OTP entry or one-off UI state.
- Custom schema-form field renderers that receive a `FieldBinding` from
  `form.field(...)` or `form.Field`.
- Component demonstrations where the goal is to show the primitive itself,
  rather than model a real submitted form.

When custom rendering is needed, keep the schema-form binding as the source of
truth:

```tsx
function AccessLevelField(props: { binding: FieldBinding<string> }) {
  return (
    <div class="grid gap-2">
      <div class="text-xs font-medium">
        {props.binding.label}
        {props.binding.required && <span class="ml-0.5 text-error-foreground">*</span>}
      </div>
      {props.binding.options?.map((option) => (
        <Button
          type="button"
          variant={props.binding.value() === option.value ? "default" : "outline"}
          onClick={() => {
            props.binding.onInput(option.value);
            props.binding.onBlur();
          }}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

<profileForm.Field name="accessLevel" component={AccessLevelField} />;
```

## Component Guidance

- `createForm`, `Form`, `form.Field`, `form.Rest`: preferred for real forms,
  including forms inside dialogs, sheets and workflow panels.
- `TextField`, `TextFieldInput`, `TextFieldTextArea`, `TextFieldLabel`,
  `TextFieldDescription`, `TextFieldErrorMessage`: use for standalone text
  controls or as pieces inside a custom schema-form field.
- `Select`, `SelectDropdown`, `Combobox`, `Autocomplete`, `RadioGroup`,
  `Checkbox`, `Switch`, `SwitchPreset`, `NumberField`, `Slider`, `DatePicker`,
  `FileField`, `FileUpload`, `ColorPickerField`, `OTPInput`: use directly for
  non-submitted UI state or wrap them in a schema-form custom field when they
  are part of submitted data.
- `Button`, `Toggle`, `ToggleGroup`, `ButtonDropdown`, `SearchBar` and search
  helpers: use directly for actions, filters and local UI state; they do not
  replace schema-backed submitted fields.
