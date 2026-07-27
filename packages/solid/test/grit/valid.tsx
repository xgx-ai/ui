/** Nothing here may produce a diagnostic. Guards against over-matching. */

// Props taken whole, read at the point of use.
export function Counter(props) {
  return props.value;
}
export const Badge = (props) => props.label;

// Plain helpers may destructure freely — they are not components.
export function toSeeds({ rates }) {
  return rates;
}
export const mapRow = ({ id, name }) => `${id}:${name}`;

// Destructuring anywhere other than the parameter list is fine.
export function Panel(props) {
  const { width, height } = props.layout;
  return width + height;
}

// Two-phase effects.
export function effects() {
  createEffect(
    () => dependency(),
    (value) => {
      apply(value);
    },
  );
  createRenderEffect(
    () => dependency(),
    (value) => {
      apply(value);
    },
  );
}

// The contract itself.
export function Editor(props) {
  const initial = readInitialProp(() => props.initialBranding);
  return initial;
}
