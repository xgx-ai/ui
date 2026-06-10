import { Dynamic } from "@solidjs/web";
import { createMemo, type Component } from "solid-js";
import { SchemaCheckboxField } from "./fields/checkbox-field.tsx";
import { SchemaNumberField } from "./fields/number-field.tsx";
import { SchemaSelectField } from "./fields/select-field.tsx";
import { SchemaStringArrayField } from "./fields/string-array-field.tsx";
import { SchemaTextField } from "./fields/text-field.tsx";
import { SchemaTextareaField } from "./fields/textarea-field.tsx";
import { SchemaUnsupportedField } from "./fields/unsupported-field.tsx";
import type { FieldBinding, FieldMeta, FormInstance } from "./types.ts";

function resolveComponent(meta: FieldMeta | undefined): Component<{ binding: FieldBinding }> {
  if (!meta) return SchemaTextField as Component<{ binding: FieldBinding }>;

  switch (meta.type) {
    case "boolean":
      return SchemaCheckboxField as Component<{ binding: FieldBinding }>;
    case "enum":
      return SchemaSelectField as Component<{ binding: FieldBinding }>;
    case "number":
      return SchemaNumberField as Component<{ binding: FieldBinding }>;
    case "string":
      if (meta.rows) {
        return SchemaTextareaField as Component<{ binding: FieldBinding }>;
      }
      return SchemaTextField as Component<{ binding: FieldBinding }>;
    case "string-array":
      return SchemaStringArrayField as Component<{ binding: FieldBinding }>;
    case "object-array":
      return SchemaUnsupportedField as Component<{ binding: FieldBinding }>;
    default:
      return SchemaTextField as Component<{ binding: FieldBinding }>;
  }
}

export function createAutoField<T extends Record<string, unknown>>(
  form: FormInstance<T>,
): Component<{
  name: string;
  component?: Component<{ binding: FieldBinding }>;
  class?: string;
}> {
  return (props) => {
    const binding = createMemo(() => form.field(props.name as keyof T & string) as FieldBinding);
    const fieldMeta = createMemo(() => form.meta[props.name]);
    const FieldComponent = createMemo(() => props.component ?? resolveComponent(fieldMeta()));
    return <Dynamic component={FieldComponent()} binding={binding()} />;
  };
}
