import * as z from "zod";
import type { FieldMeta, SelectOption } from "./types.ts";

declare module "zod" {
  interface GlobalMeta {
    placeholder?: string;
    rows?: number;
    step?: number;
    inputMode?: FieldMeta["inputMode"];
    autocomplete?: string;
  }
}

type ZodSchema = z.ZodType & {
  type?: string;
  description?: string;
  meta?: () => Record<string, unknown> | undefined;
  unwrap?: () => ZodSchema;
  isOptional?: () => boolean;
  isNullable?: () => boolean;
  options?: readonly unknown[];
  element?: ZodSchema;
  shape?: Record<string, ZodSchema>;
};

type JsonSchema = {
  type?: string | string[];
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  enum?: unknown[];
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
};

interface UnwrapResult {
  inner: ZodSchema;
  isOptional: boolean;
  defaultValue: unknown | undefined;
  description: string | undefined;
  meta: Record<string, unknown> | undefined;
}

export function unwrapField(schema: ZodSchema): UnwrapResult {
  let isOptional = Boolean(schema.isOptional?.() || schema.isNullable?.());
  let defaultValue: unknown | undefined;
  let description: string | undefined;
  let meta: Record<string, unknown> | undefined;
  let current = schema;

  const collectMeta = (layer: ZodSchema) => {
    if (!description && layer.description) {
      description = layer.description as string;
    }

    const layerMeta = layer.meta?.() as Record<string, unknown> | undefined;
    if (layerMeta) {
      meta = { ...layerMeta, ...meta };
    }
  };

  collectMeta(current);

  const defaultResult = schema.safeParse(undefined);
  if (defaultResult.success && defaultResult.data !== undefined) {
    defaultValue = defaultResult.data;
  }

  while (current.unwrap) {
    const type = current.type;
    if (type === "optional" || type === "nullable") {
      isOptional = true;
      current = current.unwrap();
      collectMeta(current);
    } else if (type === "default") {
      isOptional = true;
      current = current.unwrap();
      collectMeta(current);
    } else {
      break;
    }
  }

  return { inner: current, isOptional, defaultValue, description, meta };
}

export function introspectField(fieldSchema: ZodSchema, jsonSchema?: JsonSchema): FieldMeta {
  const { inner, isOptional, defaultValue, description, meta } = unwrapField(fieldSchema);
  const baseType = inner.type ?? jsonSchema?.type?.toString() ?? "unknown";
  const label = description ?? (meta?.label as string | undefined);

  const result: FieldMeta = {
    type: mapType(baseType),
    isOptional: isOptional || defaultValue !== undefined,
    defaultValue,
    label,
    placeholder: meta?.placeholder as string | undefined,
    rows: meta?.rows as number | undefined,
    step: meta?.step as number | undefined,
    inputMode: meta?.inputMode as FieldMeta["inputMode"],
    autocomplete: meta?.autocomplete as string | undefined,
  };

  if (baseType === "string") {
    result.format = jsonSchema?.format;
    if (jsonSchema?.minLength != null) result.minimum = jsonSchema.minLength;
    if (jsonSchema?.maxLength != null) result.maximum = jsonSchema.maxLength;
  }

  if (baseType === "number") {
    if (jsonSchema?.minimum != null) result.minimum = jsonSchema.minimum;
    if (jsonSchema?.maximum != null) result.maximum = jsonSchema.maximum;
  }

  if (baseType === "enum" || jsonSchema?.enum) {
    const entries = inner.options ?? jsonSchema?.enum ?? [];
    result.options = entries.map(String).map(
      (value): SelectOption => ({
        value,
        label: formatEnumLabel(value),
      }),
    );
  }

  if (baseType === "array" && inner.element) {
    const element = inner.element;
    const { inner: elementInner, description: elementDescription } = unwrapField(element);
    const elementType = elementInner.type;

    if (elementType === "string") {
      result.type = "string-array";
      result.itemLabel = elementDescription;
      if (jsonSchema?.items?.minLength != null) {
        result.minimum = jsonSchema.items.minLength;
      }
      if (jsonSchema?.items?.maxLength != null) {
        result.maximum = jsonSchema.items.maxLength;
      }
    } else {
      result.type = "object-array";
    }
  }

  if (meta) {
    const { label, placeholder, rows, step, inputMode, autocomplete, ...extra } = meta;
    if (Object.keys(extra).length > 0) {
      result.extra = extra;
    }
  }

  return result;
}

export function introspectSchema(objectSchema: ZodSchema): Record<string, FieldMeta> {
  const shape = objectSchema.shape;
  if (!shape) {
    throw new Error("introspectSchema expects a z.object() schema");
  }

  const jsonSchema = z.toJSONSchema(objectSchema) as JsonSchema;
  const properties = jsonSchema.properties ?? {};
  const result: Record<string, FieldMeta> = {};
  for (const [key, fieldSchema] of Object.entries(shape)) {
    result[key] = introspectField(fieldSchema as ZodSchema, properties[key]);
  }
  return result;
}

export function getSchemaDefaults(objectSchema: ZodSchema): Record<string, unknown> {
  const shape = objectSchema.shape;
  if (!shape) return {};

  const defaults: Record<string, unknown> = {};
  for (const [key, fieldSchema] of Object.entries(shape)) {
    const { inner, defaultValue } = unwrapField(fieldSchema as ZodSchema);
    if (defaultValue !== undefined) {
      defaults[key] = defaultValue;
    } else if (inner.type === "array") {
      defaults[key] = [];
    }
  }
  return defaults;
}

function mapType(zodType: string): FieldMeta["type"] {
  switch (zodType) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "enum":
      return "enum";
    case "array":
      return "string-array";
    default:
      return "string";
  }
}

function formatEnumLabel(value: string): string {
  return value
    .replace(/[_-]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
