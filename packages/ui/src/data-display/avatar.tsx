/**
 * # Avatar
 *
 * Renders a user image with a styled fallback.
 *
 * @example
 * ```tsx
 * <Avatar>
 *   <AvatarImage src="/users/ada.png" alt="Ada Lovelace" />
 *   <AvatarFallback>AL</AvatarFallback>
 * </Avatar>
 * ```
 */
import type { ComponentProps, JSX } from "@solidjs/web";
import { createContext, createSignal, omit, Show, useContext } from "solid-js";
import { cn } from "../cn";

type AvatarRootProps = ComponentProps<"span"> & {
  children?: JSX.Element;
};

const AvatarContext = createContext<{
  failed: () => boolean;
  loaded: () => boolean;
  setFailed: (failed: boolean) => void;
  setLoaded: (loaded: boolean) => void;
}>({
  failed: () => false,
  loaded: () => false,
  setFailed: () => {},
  setLoaded: () => {},
});

const Avatar = (props: AvatarRootProps) => {
  const local = props;
  const others = omit(props, "class", "children");
  const [loaded, setLoaded] = createSignal(false);
  const [failed, setFailed] = createSignal(false);

  return (
    <AvatarContext value={{ loaded, failed, setLoaded, setFailed }}>
      <span
        class={cn("relative flex size-10 shrink-0 overflow-hidden rounded-full", local.class)}
        {...others}
      >
        {local.children}
      </span>
    </AvatarContext>
  );
};

type AvatarImageProps = ComponentProps<"img">;

const AvatarImage = (props: AvatarImageProps) => {
  const context = useContext(AvatarContext);
  const local = props;
  const others = omit(props, "class", "onError", "onLoad");

  const onLoad: JSX.EventHandler<HTMLImageElement, Event> = (event) => {
    context.setLoaded(true);
    context.setFailed(false);
    const handler = local.onLoad as JSX.EventHandler<HTMLImageElement, Event> | undefined;
    handler?.(event);
  };
  const onError: JSX.EventHandler<HTMLImageElement, Event> = (event) => {
    context.setFailed(true);
    context.setLoaded(false);
    const handler = local.onError as JSX.EventHandler<HTMLImageElement, Event> | undefined;
    handler?.(event);
  };

  return (
    <Show when={!context.failed()}>
      <img
        class={cn("aspect-square size-full object-cover", local.class)}
        onLoad={onLoad}
        onError={onError}
        {...others}
      />
    </Show>
  );
};

type AvatarFallbackProps = ComponentProps<"span">;

const AvatarFallback = (props: AvatarFallbackProps) => {
  const context = useContext(AvatarContext);
  const local = props;
  const others = omit(props, "class");

  return (
    <Show when={!context.loaded() || context.failed()}>
      <span
        class={cn(
          "absolute inset-0 flex size-full items-center justify-center bg-muted",
          local.class,
        )}
        {...others}
      />
    </Show>
  );
};

export type { AvatarFallbackProps, AvatarImageProps, AvatarRootProps };
export { Avatar, AvatarFallback, AvatarImage };
