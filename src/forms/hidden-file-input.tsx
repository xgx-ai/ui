import { type ComponentProps, type JSX, splitProps } from "solid-js";

export interface HiddenFileInputProps
  extends Omit<ComponentProps<"input">, "type"> {
  ref?: HTMLInputElement | ((el: HTMLInputElement) => void);
}

/**
 * A hidden file input element for use with custom trigger buttons.
 * Use this when you need a simple file picker without the full FileUpload component.
 */
export function HiddenFileInput(props: HiddenFileInputProps): JSX.Element {
  const [local, rest] = splitProps(props, ["ref", "class"]);
  return (
    <input
      ref={local.ref}
      type="file"
      class={local.class ?? "hidden"}
      {...rest}
    />
  );
}
