import { cn } from "../cn";
import { TextField, type TextFieldInputProps, TextFieldTextArea } from "./text-field";
import { createUniqueId, Show } from "solid-js";
import { Label } from "./label";

type TextFieldAreaProps = {
  label?: string;
  placeholder?: string;
  id: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  setErrors?: (value: string) => void;
  required?: boolean;
  type?: TextFieldInputProps["type"];
  readOnly?: boolean;
  suspense?: any;
  class?: string;
  description?: string;
};

export default function TextFieldArea(props: TextFieldAreaProps) {
  const id = createUniqueId();

  const handleInputChange = (e: string) => {
    if (props.error) {
      props.setErrors?.(props.id);
    }
    props.onChange?.(e);
  };

  return (
    <TextField
      class={cn("grid gap-1.5", props.class)}
      readOnly={props.readOnly}
      required={props.required}
      onChange={handleInputChange}
      value={props.value ?? ""}
      validationState={props.error ? "invalid" : "valid"}
    >
      <Label required={props.required}>{props.label}</Label>
      <Show when={props.description}>
        <p class="text-[9px] text-muted-foreground">{props.description}</p>
      </Show>

      {/* normal text area for use when inputting on app */}
      <div class="relative">
        <TextFieldTextArea
          class={cn("screen-only", props.class)}
          readOnly={props.readOnly}
          id={id}
          placeholder={props.placeholder ?? props.label}
        >
          <Show when={props.suspense}>
            <></>
          </Show>
        </TextFieldTextArea>
      </div>

      <div
        class={cn(
          "transition-all opacity-0 h-0 duration-300 ease-in-out text-xs text-error",
          props.error && "opacity-100 h-4",
        )}
      >
        {props.error}
      </div>
    </TextField>
  );
}
