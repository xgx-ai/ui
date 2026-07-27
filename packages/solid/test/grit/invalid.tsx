/** Every line here must produce a diagnostic. Counts are asserted in grit.test.ts. */

// no-destructured-props
export function Counter({ value }) {
  return value;
}
export const Badge = ({ label }) => label;

// no-single-callback-effect
export function single() {
  createEffect(() => {
    track();
  });
  createRenderEffect(() => {
    track();
  });
}

// initial-prop-contract: error branch
export function Editor(props) {
  const initial = untrack(() => props.initialBranding);
  return initial;
}

// initial-prop-contract: warn branch
export function imperative() {
  return untrack(() => somethingElse());
}
