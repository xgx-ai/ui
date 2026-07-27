/**
 * Negative type tests for the initial-prop contract.
 *
 * These are checked by `bun run solid:typecheck`, not by the test runner. Every
 * `@ts-expect-error` is an assertion: if the error it describes ever stops occurring,
 * TypeScript reports the unused directive and the typecheck fails. That makes this file
 * fail in both directions — when a rule breaks, and when a rule silently becomes weaker.
 */

import { type InitialProp, initialProp, readInitialProp } from "../src/index.ts";

type Branding = { colour: string; id: string };

declare const branding: Branding;
declare const props: {
  initialBranding: InitialProp<Branding>;
  liveBranding: Branding;
};

// ---------------------------------------------------------------------------
// A raw value cannot satisfy `InitialProp<T>`.
// ---------------------------------------------------------------------------

declare function receive(input: { initialBranding: InitialProp<Branding> }): void;

receive({ initialBranding: initialProp(branding, branding.id) });

// @ts-expect-error a raw value must be marked with `initialProp` at the call site
receive({ initialBranding: branding });

// ---------------------------------------------------------------------------
// Marking requires an identity, and the identity must be a stable primitive.
// ---------------------------------------------------------------------------

// @ts-expect-error the identity argument is required, not optional
initialProp(branding);

// @ts-expect-error an identity must be a stable primitive, not an object
initialProp(branding, branding);

// @ts-expect-error an identity must be a stable primitive, not an accessor
initialProp(branding, () => branding.id);

// ---------------------------------------------------------------------------
// An initial prop cannot be consumed as `T` without `readInitialProp`.
// ---------------------------------------------------------------------------

const _read: Branding = readInitialProp(() => props.initialBranding);

// @ts-expect-error an initial prop is opaque; it must be read with `readInitialProp`
const _direct: Branding = props.initialBranding;

// @ts-expect-error the opaque type has no members of the underlying value
const _member: string = props.initialBranding.colour;

// ---------------------------------------------------------------------------
// `readInitialProp` only accepts an initial prop.
// ---------------------------------------------------------------------------

// @ts-expect-error a live prop is not an initial prop
readInitialProp(() => props.liveBranding);

// ---------------------------------------------------------------------------
// The brand is per-type, so unrelated initial props are not interchangeable.
// ---------------------------------------------------------------------------

declare const initialName: InitialProp<string>;

// @ts-expect-error `InitialProp<string>` is not an `InitialProp<Branding>`
receive({ initialBranding: initialName });

// ---------------------------------------------------------------------------
// The marked value keeps its underlying type through the round trip.
// ---------------------------------------------------------------------------

const _roundTrip: Branding = readInitialProp(() => initialProp(branding, branding.id));

// @ts-expect-error the round trip returns `Branding`, not `string`
const _wrongRoundTrip: string = readInitialProp(() => initialProp(branding, branding.id));

export type { Branding };

// ---------------------------------------------------------------------------
// Optional initial props read as `T | undefined`.
// ---------------------------------------------------------------------------

declare const optionalProps: { initialBody?: InitialProp<string> };

const _optional: string | undefined = readInitialProp(() => optionalProps.initialBody);

// @ts-expect-error an optional initial prop cannot be read as a non-optional value
const _optionalNarrowed: string = readInitialProp(() => optionalProps.initialBody);
