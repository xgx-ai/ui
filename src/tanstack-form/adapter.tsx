import type { JSX } from "@solidjs/web";
import { createComponent } from "@solidjs/web";
import {
  FieldApi,
  FieldGroupApi,
  FormApi,
  FormGroupApi,
  functionalUpdate,
} from "@tanstack/form-core";
import type { Store } from "@tanstack/store";
import { createContext, createRenderEffect, createSignal, onCleanup, useContext } from "solid-js";
import { createMountEffect } from "../utils/lifecycle";
import { splitProps } from "../utils/split-props";

export * from "@tanstack/form-core";

type StoreLike<TState> = Pick<Store<TState>, "get" | "subscribe">;

export function useStore<TState, TSelected = TState>(
  store: StoreLike<TState>,
  selector: (state: TState) => TSelected = (state) => state as unknown as TSelected,
  options?: { compare?: (a: TSelected, b: TSelected) => boolean },
) {
  const [selected, setSelected] = createSignal(
    {
      value: selector(store.get()),
    },
    {
      equals: false,
    },
  );
  const subscription = store.subscribe((snapshot) => {
    const next = selector(snapshot as TState);
    if (!options?.compare?.(selected().value, next)) {
      setSelected({ value: next });
    }
  });

  onCleanup(() => subscription.unsubscribe());

  return () => selected().value;
}

function makeFieldReactive<
  TField extends FieldApi<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >,
>(fieldApi: TField, mode?: string) {
  const [field, setField] = createSignal({ field: fieldApi }, { equals: false });
  const value = useStore(fieldApi.store, (state) =>
    mode === "array" ? state.meta._arrayVersion || 0 : state.value,
  );
  const touched = useStore(fieldApi.store, (state) => state.meta.isTouched);
  const blurred = useStore(fieldApi.store, (state) => state.meta.isBlurred);
  const dirty = useStore(fieldApi.store, (state) => state.meta.isDirty);
  const errorMap = useStore(fieldApi.store, (state) => state.meta.errorMap);
  const errorSourceMap = useStore(fieldApi.store, (state) => state.meta.errorSourceMap);
  const validating = useStore(fieldApi.store, (state) => state.meta.isValidating);

  createRenderEffect(
    () => [value(), touched(), blurred(), dirty(), errorMap(), errorSourceMap(), validating()],
    () => {
      setField({ field: fieldApi });
    },
  );

  return () => field().field;
}

export function createField(opts: () => Record<string, unknown>) {
  const options = opts();
  const api = new FieldApi(options as never);
  let mounted = false;

  createMountEffect(() => {
    const cleanup = api.mount();
    mounted = true;
    return () => {
      cleanup();
      mounted = false;
    };
  });

  createRenderEffect(opts, (next) => {
    if (mounted) api.update(next as never);
  });

  return makeFieldReactive(api, options.mode as string | undefined);
}

export function Field(
  props: Record<string, unknown> & {
    children: (field: ReturnType<typeof createField>) => JSX.Element;
  },
) {
  const fieldApi = createField(() => {
    const { children: _children, ...fieldOptions } = props;
    return fieldOptions;
  });

  return createComponent(() => props.children(fieldApi), {});
}

function makeFormGroupReactive(
  api: FormGroupApi<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >,
) {
  const [group, setGroup] = createSignal({ group: api }, { equals: false });
  const state = useStore(api.store, (storeState) => storeState);

  createRenderEffect(state, () => {
    setGroup({ group: api });
  });

  return () => group().group;
}

export function createFormGroup(opts: () => Record<string, unknown>) {
  const options = opts();
  const api = new FormGroupApi(options as never);
  let mounted = false;

  createMountEffect(() => {
    const cleanup = api.mount();
    mounted = true;
    return () => {
      cleanup();
      mounted = false;
    };
  });

  createRenderEffect(opts, (next) => {
    if (mounted) api.update(next as never);
  });

  return makeFormGroupReactive(api);
}

export function FormGroup(
  props: Record<string, unknown> & {
    children: (group: ReturnType<typeof createFormGroup>) => JSX.Element;
  },
) {
  const group = createFormGroup(() => {
    const { children: _children, ...groupOptions } = props;
    return groupOptions;
  });

  return createComponent(() => props.children(group), {});
}

export function createFieldGroup(opts: () => Record<string, unknown>) {
  const options = opts();
  const api = new FieldGroupApi(options as never);
  const form = options.form instanceof FieldGroupApi ? options.form.form : options.form;
  const extendedApi = api as typeof api & Record<string, unknown>;

  extendedApi.AppForm = (appFormProps: Record<string, unknown>) =>
    createComponent((form as any).AppForm, appFormProps);
  extendedApi.AppField = (props: Record<string, unknown>) =>
    createComponent((form as any).AppField, api.getFormFieldOptions(props as never));
  extendedApi.Field = (props: Record<string, unknown>) =>
    createComponent((form as any).Field, api.getFormFieldOptions(props as never));
  extendedApi.Subscribe = (props: {
    selector?: (state: unknown) => unknown;
    children: (value: unknown) => JSX.Element;
  }) => functionalUpdate(props.children, useStore(api.store, props.selector)());

  createMountEffect(() => api.mount());

  return Object.assign(extendedApi, options.formComponents);
}

export function createForm(opts?: () => Record<string, unknown>) {
  const api = new FormApi((opts?.() ?? {}) as never);
  const extendedApi = api as typeof api & Record<string, unknown>;

  extendedApi.Field = (props: Record<string, unknown>) =>
    createComponent(Field as never, { ...props, form: api } as never);
  extendedApi.FormGroup = (props: Record<string, unknown>) =>
    createComponent(FormGroup as never, { ...props, form: api } as never);
  extendedApi.useStore = (selector: (state: unknown) => unknown) => useStore(api.store, selector);
  extendedApi.Subscribe = (props: {
    selector?: (state: unknown) => unknown;
    children: (value: unknown) => JSX.Element;
  }) => functionalUpdate(props.children, useStore(api.store, props.selector)());

  createMountEffect(() => api.mount());
  createRenderEffect(
    () => opts?.(),
    (next) => api.update(next as never),
  );

  return extendedApi;
}

export function createFormHookContexts() {
  const fieldContext = createContext<unknown>(null);
  const formContext = createContext<unknown>(null);

  function useFieldContext() {
    const field = useContext(fieldContext);
    if (!field) {
      throw new Error(
        "`fieldContext` only works inside a fieldComponent passed to `createFormHook`",
      );
    }
    return field;
  }

  function useFormContext() {
    const form = useContext(formContext);
    if (!form) {
      throw new Error("`formContext` only works inside a formComponent passed to `createFormHook`");
    }
    return form;
  }

  return { fieldContext, formContext, useFieldContext, useFormContext };
}

export function createFormHook(opts: {
  fieldContext: ReturnType<typeof createContext>;
  formContext: ReturnType<typeof createContext>;
  fieldComponents: Record<string, unknown>;
  formComponents: Record<string, unknown>;
}) {
  function useAppForm(props?: () => Record<string, unknown>) {
    const form = createForm(props);

    const AppForm = (formProps: { children?: JSX.Element }) => (
      <opts.formContext value={form}>{formProps.children}</opts.formContext>
    );

    const AppField = (
      rawProps: Record<string, unknown> & {
        children: (field: Record<string, unknown>) => JSX.Element;
      },
    ) => {
      const [childProps, fieldProps] = splitProps(rawProps, ["children"]);
      return createComponent(form.Field as never, {
        ...fieldProps,
        children: (field: unknown) => (
          <opts.fieldContext value={field}>
            {childProps.children(
              Object.assign(field as Record<string, unknown>, opts.fieldComponents),
            )}
          </opts.fieldContext>
        ),
      });
    };

    return Object.assign(form, {
      AppField,
      AppForm,
      ...opts.formComponents,
    });
  }

  function withForm<TProps extends Record<string, unknown>>(config: {
    render: (props: TProps) => JSX.Element;
    props?: Partial<TProps>;
  }) {
    return (innerProps: TProps) =>
      createComponent(config.render, {
        ...config.props,
        ...innerProps,
      } as TProps);
  }

  function withFieldGroup<TProps extends Record<string, unknown>>(config: {
    render: (props: TProps) => JSX.Element;
    props?: Partial<TProps>;
    defaultValues?: unknown;
  }) {
    return (innerProps: TProps & Record<string, unknown>) => {
      const group = createFieldGroup(() => ({
        form: innerProps.form,
        fields: innerProps.fields,
        defaultValues: config.defaultValues,
        formComponents: opts.formComponents,
      }));
      return createComponent(config.render, {
        ...config.props,
        ...innerProps,
        group,
      } as TProps);
    };
  }

  return { useAppForm, withForm, withFieldGroup };
}
