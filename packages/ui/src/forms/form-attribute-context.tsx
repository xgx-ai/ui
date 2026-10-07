import type { JSX } from "@solidjs/web";
import { createContext, useContext } from "solid-js";

import type { TextFieldFormProps } from "./form-components/text-field-form";

type TextFieldFormExtendedProps = Partial<TextFieldFormProps> & JSX.IntrinsicElements["input"];

// Optional: fields read extra attributes only when a provider supplies them.
const FormAttributeContext = createContext<{
  props: TextFieldFormExtendedProps;
} | null>(null);

export const FormAttributeProvider = (
  props: TextFieldFormExtendedProps & { children?: JSX.Element },
) => <FormAttributeContext value={{ props }}>{props.children}</FormAttributeContext>;

export const useUndefined = () => useContext(FormAttributeContext);

export const useFormAttributesProvider = () => useUndefined()!;
