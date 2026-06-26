import { createAuthClient } from "better-auth/client";
import type { BetterAuthClientOptions } from "better-auth/client";
import { createSignal, onCleanup, type Accessor } from "solid-js";

export type ReadableAtom<T> = {
  get: () => T;
  listen: (listener: (value: T, oldValue?: T) => void) => () => void;
  subscribe: (listener: (value: T, oldValue?: T) => void) => () => void;
};

type AtomValue<TAtom> = TAtom extends ReadableAtom<infer TValue> ? TValue : never;

type VanillaAuthClient<Option extends BetterAuthClientOptions> = ReturnType<
  typeof createAuthClient<Option>
>;

export type SolidSessionClient<
  TClient extends { useSession: ReadableAtom<unknown> },
> = Omit<TClient, "useSession"> & {
  useSession: () => Accessor<AtomValue<TClient["useSession"]>>;
};

export type SolidAuthClient<Option extends BetterAuthClientOptions> =
  SolidSessionClient<VanillaAuthClient<Option>>;

export function useReadableAtom<T>(store: ReadableAtom<T>): Accessor<T> {
  const unbindActivation = store.listen(() => {});
  const [value, setValue] = createSignal<{ value: T }>(
    { value: store.get() },
    { equals: false },
  );
  const unsubscribe = store.subscribe((newValue) => {
    setValue({ value: newValue });
  });
  onCleanup(() => unsubscribe());
  unbindActivation();
  return (() => value().value) as Accessor<T>;
}

export function withSolidSessionClient<
  TClient extends { useSession: ReadableAtom<unknown> },
>(client: TClient): SolidSessionClient<TClient> {
  return new Proxy(client, {
    get(target, property, receiver) {
      if (property === "useSession") {
        return () => useReadableAtom(client.useSession);
      }
      return Reflect.get(target, property, receiver);
    },
  }) as unknown as SolidSessionClient<TClient>;
}

export function createSolidAuthClient<Option extends BetterAuthClientOptions>(
  options?: Option,
): SolidAuthClient<Option> {
  return withSolidSessionClient(createAuthClient(options));
}
