import { createEffect, untrack } from "solid-js";

declare const initialPropBrand: unique symbol;

/**
 * A prop the receiving component reads exactly once.
 *
 * The type is opaque so neither end of the boundary can treat it as an ordinary live
 * prop: a raw `T` cannot be passed where an `InitialProp<T>` is expected, and an
 * `InitialProp<T>` cannot be consumed as `T` without `readInitialProp`.
 */
export type InitialProp<T> = { readonly [initialPropBrand]: T };

type MarkedProp<T> = { identity: string | number; value: T };

/**
 * Marks a value as deliberately sampled once by the receiving component, and declares the
 * identity that sample belongs to.
 *
 * The identity lives here rather than at the read site because the invariant it protects —
 * "this component must remount when its subject changes" — is enforced by the *parent*,
 * which is also what decides keying. Keeping the value and its identity together means
 * they cannot drift, and a consumer cannot forget to declare one.
 *
 * `identity` must be a stable primitive that changes when the subject changes, normally
 * the id of the record the value came from.
 */
export function initialProp<T>(value: T, identity: string | number): InitialProp<T> {
  return { identity, value } satisfies MarkedProp<T> as unknown as InitialProp<T>;
}

const isDevelopment = () => typeof process === "undefined" || process.env.NODE_ENV !== "production";

export class StaleInitialPropError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StaleInitialPropError";
  }
}

type StaleInitialPropReporter = (error: StaleInitialPropError) => void;

let reportStaleInitialProp: StaleInitialPropReporter = (error) => {
  console.error(error);
};

/**
 * Replaces the development reporter, for test setup that should fail on a stale snapshot.
 * Returns a function that restores the previous reporter.
 */
export function onStaleInitialProp(reporter: StaleInitialPropReporter): () => void {
  const previous = reportStaleInitialProp;
  reportStaleInitialProp = reporter;
  return () => {
    reportStaleInitialProp = previous;
  };
}

/**
 * Reads an initial prop once, and in development asserts the snapshot stays valid.
 *
 * Types can express "this prop is sampled once"; they cannot express the invariant that
 * actually prevents the bug, which is "this component must remount when its subject
 * changes". While the component stays mounted, a change to the declared identity means
 * the snapshot now describes a different subject, so the component should have been
 * remounted and was not. In development that is reported; it is deliberately not thrown,
 * because an effect that throws makes Solid halt the whole reactive graph.
 *
 * @example
 * ```tsx
 * // parent
 * <BrandingEditor initialBranding={initialProp(branding, branding.id)} />
 *
 * // child
 * function BrandingEditor(props: { initialBranding: InitialProp<OrganisationBranding> }) {
 *   const initial = readInitialProp(() => props.initialBranding);
 *   const [draft, setDraft] = createStore(toDraft(initial));
 *   // …
 * }
 * ```
 */
export function readInitialProp<T>(read: () => InitialProp<T>): T;
export function readInitialProp<T>(read: () => InitialProp<T> | undefined): T | undefined;
export function readInitialProp<T>(read: () => InitialProp<T> | undefined): T | undefined {
  const marked = untrack(read) as unknown as MarkedProp<T> | undefined;

  if (isDevelopment()) {
    const snapshotIdentity = marked?.identity;

    createEffect(
      () => (read() as unknown as MarkedProp<T> | undefined)?.identity,
      (current) => {
        if (current === snapshotIdentity) return;
        reportStaleInitialProp(
          new StaleInitialPropError(
            `An initial prop was sampled for identity ${JSON.stringify(snapshotIdentity)} ` +
              `but its identity is now ${JSON.stringify(current)} and the component did not ` +
              "remount, so the snapshot describes a different subject. Give the component a " +
              "keyed remount boundary on that identity, or make the prop live instead of initial.",
          ),
        );
      },
    );
  }

  return marked?.value;
}
