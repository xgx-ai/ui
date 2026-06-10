import { type Component, For } from "solid-js";
import type { FormInstance } from "./types.ts";

export function createRest<T extends Record<string, unknown>>(form: FormInstance<T>): Component {
  return () => {
    const unclaimed = () => form.fieldNames.filter((name) => !form.claimed.has(name));

    return <For each={unclaimed()}>{(name) => <form.Field name={name} />}</For>;
  };
}
