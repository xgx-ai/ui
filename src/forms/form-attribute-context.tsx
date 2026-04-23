import { createContextProvider } from "@solid-primitives/context";
import type { JSX } from "solid-js";
import type { TextFieldFormProps } from "./form-components/text-field-form";

type TextFieldFormExtendedProps = Partial<TextFieldFormProps> &
  JSX.IntrinsicElements["input"];

export const [FormAttributeProvider, useUndefined] = createContextProvider(
  (props: TextFieldFormExtendedProps) => {
    return {
      props,
    };
  },
);

export const useFormAttributesProvider = () => useUndefined()!;
