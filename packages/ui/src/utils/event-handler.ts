/**
 * Calls a JSX event handler prop that a component intercepts before adding its own behaviour.
 *
 * Accepts both forms Solid allows for `on*` props: a plain function and a bound
 * `[handler, data]` tuple, which is called as `handler(data, event)`.
 */
export function callEventHandler<TEvent extends Event>(handler: unknown, event: TEvent) {
  if (typeof handler === "function") {
    handler(event);
    return;
  }
  if (Array.isArray(handler) && typeof handler[0] === "function") {
    handler[0](handler[1], event);
  }
}
