import type { ComponentProps } from "@solidjs/web";
import type { JSX } from "@solidjs/web";
import { splitProps } from "../utils/split-props";
import { Circle } from "../icons.index";
import type { Component } from "solid-js";
import { createContext, createSignal, Show, useContext } from "solid-js";
import { cn } from "../cn";

export const REGEXP_ONLY_DIGITS = "^\\d*$";
export const REGEXP_ONLY_CHARS = "^[a-zA-Z]*$";
export const REGEXP_ONLY_DIGITS_AND_CHARS = "^[a-zA-Z0-9]*$";

type OTPContextValue = {
  value: () => string;
  setValue: (v: string) => void;
  activeIndex: () => number;
  setActiveIndex: (i: number) => void;
  maxLength: number;
  disabled: () => boolean;
  pattern: RegExp | null;
  inputRef: () => HTMLInputElement | undefined;
  setInputRef: (el: HTMLInputElement) => void;
};

const OTPContext = createContext<OTPContextValue>();

function useOTPContext() {
  const context = useContext(OTPContext);
  if (!context) {
    throw new Error("OTP components must be used within OTPField");
  }
  return context;
}

type OTPFieldProps = ComponentProps<"div"> & {
  maxLength: number;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  pattern?: string;
  children?: JSX.Element;
};

const OTPField: Component<OTPFieldProps> = (props) => {
  const [local, others] = splitProps(props, [
    "class",
    "maxLength",
    "value",
    "defaultValue",
    "onValueChange",
    "onComplete",
    "disabled",
    "pattern",
    "children",
  ]);

  const [internalValue, setInternalValue] = createSignal(local.defaultValue || "");
  const [activeIndex, setActiveIndex] = createSignal(-1);
  const [inputRef, setInputRef] = createSignal<HTMLInputElement>();

  const value = () => (local.value !== undefined ? local.value : internalValue());
  const setValue = (v: string) => {
    const pattern = local.pattern ? new RegExp(local.pattern) : null;
    if (pattern && !pattern.test(v)) return;

    if (local.value === undefined) {
      setInternalValue(v);
    }
    local.onValueChange?.(v);

    if (v.length === local.maxLength) {
      local.onComplete?.(v);
    }
  };

  const contextValue: OTPContextValue = {
    value,
    setValue,
    activeIndex,
    setActiveIndex,
    maxLength: local.maxLength,
    disabled: () => local.disabled || false,
    pattern: local.pattern ? new RegExp(local.pattern) : null,
    inputRef,
    setInputRef,
  };

  return (
    <OTPContext value={contextValue}>
      <div
        class={cn(
          "relative flex items-center gap-2",
          local.disabled && "cursor-not-allowed opacity-50",
          local.class,
        )}
        {...others}
      >
        {local.children}
      </div>
    </OTPContext>
  );
};

const OTPFieldInput: Component<ComponentProps<"input">> = (props) => {
  const ctx = useOTPContext();
  const [local, others] = splitProps(props, ["class"]);

  const handleInput = (e: InputEvent) => {
    const input = e.target as HTMLInputElement;
    let newValue = input.value.slice(0, ctx.maxLength);

    if (ctx.pattern && !ctx.pattern.test(newValue)) {
      newValue = ctx.value();
    }

    ctx.setValue(newValue);
    ctx.setActiveIndex(Math.min(newValue.length, ctx.maxLength - 1));
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Backspace" && ctx.value().length > 0) {
      ctx.setValue(ctx.value().slice(0, -1));
      ctx.setActiveIndex(Math.max(0, ctx.value().length - 1));
    }
  };

  const handleFocus = () => {
    ctx.setActiveIndex(ctx.value().length);
  };

  const handleBlur = () => {
    ctx.setActiveIndex(-1);
  };

  return (
    <input
      ref={ctx.setInputRef}
      type="text"
      inputmode="numeric"
      autocomplete="one-time-code"
      value={ctx.value()}
      maxlength={ctx.maxLength}
      disabled={ctx.disabled()}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      class={cn("absolute inset-0 opacity-0 cursor-pointer", local.class)}
      {...others}
    />
  );
};

const OTPFieldGroup: Component<ComponentProps<"div">> = (props) => {
  const [local, others] = splitProps(props, ["class"]);
  const ctx = useOTPContext();

  const handleClick = () => {
    ctx.inputRef()?.focus();
  };

  return (
    <div
      role="group"
      class={cn(
        "relative flex items-center [&>div:first-of-type]:rounded-l-md [&>div:first-of-type]:ml-0 [&>div:last-of-type]:rounded-r-md",
        local.class,
      )}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
      {...others}
    />
  );
};

type OTPFieldSlotProps = ComponentProps<"div"> & {
  index: number;
};

const OTPFieldSlot: Component<OTPFieldSlotProps> = (props) => {
  const [local, others] = splitProps(props, ["class", "index"]);
  const ctx = useOTPContext();

  const char = () => ctx.value()[local.index] || "";
  const isActive = () => ctx.activeIndex() === local.index;
  const showCaret = () => ctx.activeIndex() >= 0 && local.index === ctx.value().length;

  return (
    <div
      class={cn(
        "relative flex size-10 items-center justify-center border border-input text-sm transition-all -ml-px",
        isActive() && "ring-2 ring-ring ring-offset-background z-10",
        local.class,
      )}
      {...others}
    >
      {char()}
      <Show when={showCaret()}>
        <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div class="h-4 w-px animate-pulse bg-foreground" />
        </div>
      </Show>
    </div>
  );
};

const OTPFieldSeparator: Component<ComponentProps<"div">> = (props) => {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <div class={cn("flex size-6 items-center justify-center", local.class)} {...rest}>
      <Circle aria-hidden="true" class="size-1.5 fill-current" />
    </div>
  );
};

/**
 * # OTP Field
 *
 * One-time password input for verification codes.
 *
 * @example
 * ```
 * <OTPField maxLength={6} pattern="^[0-9]*$" onComplete={(value) => console.log("OTP:", value)}>
 *   <OTPFieldGroup>
 *     <OTPFieldInput />
 *     <OTPFieldSlot index={0} />
 *     <OTPFieldSlot index={1} />
 *     <OTPFieldSlot index={2} />
 *   </OTPFieldGroup>
 *   <OTPFieldSeparator />
 *   <OTPFieldGroup>
 *     <OTPFieldSlot index={3} />
 *     <OTPFieldSlot index={4} />
 *     <OTPFieldSlot index={5} />
 *   </OTPFieldGroup>
 * </OTPField>
 * ```
 */

// Simple OTP input for the common 6-digit case
type OTPInputProps = {
  value?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  class?: string;
  /** Number of digits (default: 6) */
  length?: number;
};

/**
 * # OTP Input
 *
 * Simple 6-digit OTP input - the most common use case.
 *
 * @example
 * ```
 * <OTPInput value={otp()} onChange={setOtp} onComplete={handleSubmit} />
 * ```
 */
const OTPInput: Component<OTPInputProps> = (props) => {
  const length = () => props.length ?? 6;

  return (
    <OTPField
      value={props.value}
      onValueChange={props.onChange}
      onComplete={props.onComplete}
      maxLength={length()}
      disabled={props.disabled}
      class={props.class}
    >
      <OTPFieldInput />
      <OTPFieldGroup>
        {Array.from({ length: length() }, (_, i) => (
          <OTPFieldSlot index={i} />
        ))}
      </OTPFieldGroup>
    </OTPField>
  );
};

export { OTPField, OTPFieldGroup, OTPFieldInput, OTPFieldSeparator, OTPFieldSlot, OTPInput };
