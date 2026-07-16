/** Resolve a semantic CSS token to a concrete colour MapLibre can parse. */
export function resolveMapColour(
  value: string | undefined,
  token: `--primary` | `--warning`,
  mapContainer: HTMLDivElement | undefined,
): string {
  if (value) return value;

  const parent = mapContainer?.parentElement ?? document.documentElement;
  const probe = document.createElement("span");
  probe.hidden = true;
  probe.style.color = `var(${token}, currentColor)`;
  parent.append(probe);
  const colour = getComputedStyle(probe).color;
  probe.remove();
  return colour;
}
