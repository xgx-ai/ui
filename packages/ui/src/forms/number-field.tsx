/**
 * # NumberField
 *
 * Renders a numeric input with controls and labels.
 *
 * @example
 * ```tsx
 * <NumberField value={quantity()} onChange={setQuantity}>
 *   <NumberFieldLabel>Quantity</NumberFieldLabel>
 *   <NumberFieldInput />
 * </NumberField>
 * ```
 */
import type { ComponentProps, JSX, ValidComponent } from "@solidjs/web";
import { Dynamic } from "@solidjs/web";
import {
  createContext,
  createMemo,
  createRenderEffect,
  createSignal,
  createUniqueId,
  omit,
  untrack,
  useContext,
} from "solid-js";

import { cn } from "../cn";
import { ChevronDown, ChevronUp } from "../icons.index";

type ValidationState = "valid" | "invalid";

type NumberLike = number | string | null | undefined;

type NumberFieldContextValue = {
  id: () => string;
  inputId: () => string;
  descriptionId: () => string;
  errorId: () => string;
  name: () => string | undefined;
  value: () => string;
  rawValue: () => number;
  minValue: () => number | undefined;
  maxValue: () => number | undefined;
  step: () => number;
  disabled: () => boolean;
  readOnly: () => boolean;
  required: () => boolean;
  invalid: () => boolean;
  textValue: () => string | undefined;
  setInputRef: (element: HTMLInputElement) => void;
  inputRef: () => HTMLInputElement | undefined;
  setFocused: (value: boolean) => void;
  setTextValue: (value: string) => void;
  commitValue: () => void;
  varyValue: (direction: 1 | -1) => void;
};

const NumberFieldContext = createContext<NumberFieldContextValue>();

function useNumberFieldContext() {
  const context = useContext(NumberFieldContext);
  if (!context) {
    throw new Error("Number field parts must be used inside NumberField.");
  }
  return context;
}

function decimalPlaces(value: number) {
  const text = value.toString();
  const exponent = text.match(/e-(\d+)$/)?.[1];
  if (exponent) return Number(exponent);
  return text.includes(".") ? (text.split(".")[1]?.length ?? 0) : 0;
}

function roundToStep(value: number, step: number) {
  return Number(value.toFixed(Math.min(Math.max(decimalPlaces(step), 0), 12)));
}

function parseNumber(value: NumberLike) {
  if (value == null || value === "") return Number.NaN;
  if (typeof value === "number") return value;
  const normalized = value.replaceAll(",", "").trim();
  if (normalized === "") return Number.NaN;
  return Number(normalized);
}

function composeDescriptionIds(context: NumberFieldContextValue) {
  const ids = [context.descriptionId()];
  if (context.invalid()) ids.push(context.errorId());
  return ids.join(" ");
}

function callEventHandler<TElement, TEvent>(
  handler: unknown,
  event: TEvent & { currentTarget: TElement; target: Element },
) {
  if (typeof handler === "function") {
    handler(event);
    return;
  }
  if (Array.isArray(handler) && typeof handler[0] === "function") {
    handler[0](handler[1], event);
  }
}

export type NumberFieldProps<T extends ValidComponent = "div"> = Omit<
  ComponentProps<"div">,
  "onChange"
> & {
  as?: T;
  value?: string | number;
  defaultValue?: string | number;
  rawValue?: number;
  onChange?: (value: string) => void;
  onRawValueChange?: (value: number) => void;
  validationState?: ValidationState;
  minValue?: number;
  maxValue?: number;
  step?: number;
  largeStep?: number;
  format?: boolean;
  formatOptions?: Intl.NumberFormatOptions;
  changeOnWheel?: boolean;
  allowedInput?: RegExp;
  translations?: Record<string, string>;
  textValue?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  name?: string;
  class?: string;
  children?: JSX.Element;
};

export type NumberFieldPRops<T extends ValidComponent = "div"> = NumberFieldProps<T>;

const NumberField = <T extends ValidComponent = "div">(props: NumberFieldProps<T>) => {
  const fallbackId = createUniqueId();
  const generatedId = () => String(props.id || `number-field-${fallbackId}`);
  const formatter = createMemo(() => new Intl.NumberFormat(undefined, props.formatOptions));
  const shouldFormat = () => props.format !== false;

  const formatNumber = (value: number) => {
    if (!Number.isFinite(value)) return "";
    return shouldFormat() ? formatter().format(value) : String(value);
  };

  const externalText = () => {
    if (props.rawValue !== undefined) return formatNumber(props.rawValue);
    if (props.value !== undefined) {
      return typeof props.value === "number" ? formatNumber(props.value) : props.value;
    }
    return undefined;
  };

  const initialText = () => {
    const external = externalText();
    if (external !== undefined) return external;
    if (typeof props.defaultValue === "number") return formatNumber(props.defaultValue);
    return props.defaultValue == null ? "" : String(props.defaultValue);
  };

  const [text, setText] = createSignal(untrack(initialText), { ownedWrite: true });
  const [focused, setFocused] = createSignal(false, { ownedWrite: true });
  const [inputRef, setInputRef] = createSignal<HTMLInputElement>();
  let lastExternalText: string | undefined = untrack(externalText);

  createRenderEffect(
    () => [externalText(), focused()] as const,
    ([nextExternalText, isFocused]) => {
      if (nextExternalText !== undefined && nextExternalText !== lastExternalText && !isFocused) {
        lastExternalText = nextExternalText;
        setText(nextExternalText);
      }
    },
  );

  const minValue = () => props.minValue;
  const maxValue = () => props.maxValue;
  const step = () => props.step ?? 1;
  const invalid = () => props.validationState === "invalid";
  const clampValue = (value: number) => {
    if (!Number.isFinite(value)) return value;
    let next = value;
    const min = minValue();
    const max = maxValue();
    if (min !== undefined) next = Math.max(next, min);
    if (max !== undefined) next = Math.min(next, max);
    return roundToStep(next, step());
  };
  const rawValue = () => parseNumber(text());
  const emitValue = (value: string) => {
    props.onChange?.(value);
    props.onRawValueChange?.(parseNumber(value));
  };
  const setTextValue = (value: string) => {
    if (props.allowedInput && value !== "" && !props.allowedInput.test(value)) {
      return;
    }
    setText(value);
    emitValue(value);
  };
  const commitValue = () => {
    const parsed = parseNumber(text());
    if (!Number.isFinite(parsed)) {
      setText("");
      emitValue("");
      return;
    }
    const formatted = formatNumber(clampValue(parsed));
    setText(formatted);
    emitValue(formatted);
  };
  const varyValue = (direction: 1 | -1) => {
    const current = Number.isFinite(rawValue()) ? rawValue() : 0;
    const next = clampValue(current + direction * step());
    const formatted = formatNumber(next);
    setText(formatted);
    emitValue(formatted);
    inputRef()?.focus();
  };

  const context: NumberFieldContextValue = {
    id: generatedId,
    inputId: () => `${generatedId()}-input`,
    descriptionId: () => `${generatedId()}-description`,
    errorId: () => `${generatedId()}-error`,
    name: () => props.name,
    value: text,
    rawValue,
    minValue,
    maxValue,
    step,
    disabled: () => props.disabled ?? false,
    readOnly: () => props.readOnly ?? false,
    required: () => props.required ?? false,
    invalid,
    textValue: () => props.textValue,
    setInputRef,
    inputRef,
    setFocused,
    setTextValue,
    commitValue,
    varyValue,
  };

  const local = props;
  const others = omit(
    props,
    "as",
    "children",
    "class",
    "value",
    "defaultValue",
    "rawValue",
    "onChange",
    "onRawValueChange",
    "validationState",
    "minValue",
    "maxValue",
    "step",
    "largeStep",
    "format",
    "formatOptions",
    "changeOnWheel",
    "allowedInput",
    "translations",
    "textValue",
    "disabled",
    "readOnly",
    "required",
    "name",
  );

  return (
    <NumberFieldContext value={context}>
      <Dynamic
        component={local.as ?? "div"}
        role="group"
        id={generatedId()}
        data-disabled={context.disabled() ? "" : undefined}
        data-readonly={context.readOnly() ? "" : undefined}
        data-required={context.required() ? "" : undefined}
        data-invalid={context.invalid() ? "" : undefined}
        class={cn("flex flex-col gap-1.5", local.class)}
        {...others}
      >
        {local.children}
      </Dynamic>
    </NumberFieldContext>
  );
};

type NumberFieldGroupProps = ComponentProps<"div"> & {
  class?: string;
};

const NumberFieldGroup = (props: NumberFieldGroupProps) => {
  const local = props;
  const others = omit(props, "class", "children");
  return (
    <div
      class={cn(
        "relative rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        local.class,
      )}
      {...others}
    >
      {local.children}
    </div>
  );
};

type NumberFieldLabelProps = ComponentProps<"label"> & {
  class?: string;
};

const NumberFieldLabel = (props: NumberFieldLabelProps) => {
  const context = useNumberFieldContext();
  const local = props;
  const others = omit(props, "class", "children", "for");
  return (
    <label
      for={local.for ?? context.inputId()}
      data-invalid={context.invalid() ? "" : undefined}
      class={cn(
        "text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 data-invalid:text-error-foreground",
        local.class,
      )}
      {...others}
    >
      {local.children}
    </label>
  );
};

type NumberFieldInputProps = Omit<ComponentProps<"input">, "onChange"> & {
  class?: string;
  onChange?: JSX.EventHandlerUnion<HTMLInputElement, Event>;
};

const NumberFieldInput = (props: NumberFieldInputProps) => {
  const context = useNumberFieldContext();
  const local = props;
  const others = omit(
    props,
    "class",
    "onInput",
    "onChange",
    "onBlur",
    "onFocus",
    "onKeyDown",
    "onWheel",
    "ref",
    "type",
  );
  const atMin = () => {
    const min = context.minValue();
    return min !== undefined && context.rawValue() <= min;
  };
  const atMax = () => {
    const max = context.maxValue();
    return max !== undefined && context.rawValue() >= max;
  };

  return (
    <input
      id={props.id || context.inputId()}
      ref={(element) => {
        context.setInputRef(element);
        if (typeof local.ref === "function") local.ref(element);
      }}
      type="text"
      inputmode="decimal"
      autocomplete="off"
      autocorrect="off"
      spellcheck={false}
      name={context.name()}
      value={context.value()}
      role="spinbutton"
      aria-valuemin={context.minValue()}
      aria-valuemax={context.maxValue()}
      aria-valuenow={Number.isFinite(context.rawValue()) ? context.rawValue() : undefined}
      aria-valuetext={context.textValue()}
      aria-invalid={context.invalid() ? "true" : undefined}
      aria-describedby={composeDescriptionIds(context)}
      required={context.required()}
      disabled={context.disabled()}
      readonly={context.readOnly()}
      data-invalid={context.invalid() ? "" : undefined}
      data-at-min={atMin() ? "" : undefined}
      data-at-max={atMax() ? "" : undefined}
      class={cn(
        "xgx-field-focus flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground data-invalid:border-error-foreground",
        context.disabled() && "cursor-not-allowed opacity-50",
        local.class,
      )}
      onInput={(event) => {
        callEventHandler(local.onInput, event);
        if (context.readOnly() || context.disabled()) return;
        context.setTextValue(event.currentTarget.value);
      }}
      onChange={(event) => {
        callEventHandler(local.onChange, event);
      }}
      onFocus={(event) => {
        context.setFocused(true);
        callEventHandler(local.onFocus, event);
      }}
      onBlur={(event) => {
        context.setFocused(false);
        context.commitValue();
        callEventHandler(local.onBlur, event);
      }}
      onKeyDown={(event) => {
        callEventHandler(local.onKeyDown, event);
        if (event.defaultPrevented || context.readOnly() || context.disabled()) {
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          context.varyValue(1);
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          context.varyValue(-1);
        }
        if (event.key === "Enter") {
          context.commitValue();
        }
      }}
      onWheel={(event) => {
        callEventHandler(local.onWheel, event);
        if (
          props.onWheel ||
          context.readOnly() ||
          context.disabled() ||
          document.activeElement !== context.inputRef()
        ) {
          return;
        }
        event.preventDefault();
        context.varyValue(event.deltaY < 0 ? 1 : -1);
      }}
      {...others}
    />
  );
};

type NumberFieldTriggerProps = ComponentProps<"button"> & {
  class?: string;
  children?: JSX.Element;
};

const NumberFieldIncrementTrigger = (props: NumberFieldTriggerProps) => {
  const context = useNumberFieldContext();
  const local = props;
  const others = omit(props, "aria-label", "class", "children", "disabled", "onClick", "type");
  const disabled = () =>
    Boolean(local.disabled) ||
    context.disabled() ||
    context.readOnly() ||
    (context.maxValue() !== undefined && context.rawValue() >= context.maxValue()!);

  return (
    <button
      type={local.type ?? "button"}
      tabindex={-1}
      aria-controls={context.inputId()}
      aria-label={local["aria-label"] ?? "Increase value"}
      disabled={disabled()}
      class={cn(
        "absolute right-1 top-1 inline-flex size-4 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-hover hover:text-hover-foreground disabled:pointer-events-none disabled:opacity-40",
        local.class,
      )}
      onClick={(event) => {
        callEventHandler(local.onClick, event);
        if (!event.defaultPrevented) context.varyValue(1);
      }}
      {...others}
    >
      {local.children ?? <ChevronUp aria-hidden="true" class="size-3.5" />}
    </button>
  );
};

const NumberFieldDecrementTrigger = (props: NumberFieldTriggerProps) => {
  const context = useNumberFieldContext();
  const local = props;
  const others = omit(props, "aria-label", "class", "children", "disabled", "onClick", "type");
  const disabled = () =>
    Boolean(local.disabled) ||
    context.disabled() ||
    context.readOnly() ||
    (context.minValue() !== undefined && context.rawValue() <= context.minValue()!);

  return (
    <button
      type={local.type ?? "button"}
      tabindex={-1}
      aria-controls={context.inputId()}
      aria-label={local["aria-label"] ?? "Decrease value"}
      disabled={disabled()}
      class={cn(
        "absolute bottom-1 right-1 inline-flex size-4 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-hover hover:text-hover-foreground disabled:pointer-events-none disabled:opacity-40",
        local.class,
      )}
      onClick={(event) => {
        callEventHandler(local.onClick, event);
        if (!event.defaultPrevented) context.varyValue(-1);
      }}
      {...others}
    >
      {local.children ?? <ChevronDown aria-hidden="true" class="size-3.5" />}
    </button>
  );
};

type NumberFieldDescriptionProps = ComponentProps<"div"> & {
  class?: string;
};

const NumberFieldDescription = (props: NumberFieldDescriptionProps) => {
  const context = useNumberFieldContext();
  const local = props;
  const others = omit(props, "class", "children", "id");
  return (
    <div
      id={local.id || context.descriptionId()}
      class={cn("text-xs text-muted-foreground", local.class)}
      {...others}
    >
      {local.children}
    </div>
  );
};

type NumberFieldErrorMessageProps = ComponentProps<"div"> & {
  class?: string;
};

const NumberFieldErrorMessage = (props: NumberFieldErrorMessageProps) => {
  const context = useNumberFieldContext();
  const local = props;
  const others = omit(props, "class", "children", "id");
  return (
    <div
      id={local.id || context.errorId()}
      class={cn("text-xs text-error-foreground", local.class)}
      {...others}
    >
      {local.children}
    </div>
  );
};

export {
  NumberField,
  NumberFieldDecrementTrigger,
  NumberFieldDescription,
  NumberFieldErrorMessage,
  NumberFieldGroup,
  NumberFieldIncrementTrigger,
  NumberFieldInput,
  NumberFieldLabel,
};
